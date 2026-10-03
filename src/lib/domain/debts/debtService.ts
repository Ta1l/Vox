import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as money from "@/lib/money";
import { debtPayments, debts, type Debt, type DebtSchedule, type DebtStatus } from "@/lib/db/schema/debts";

const DAY_MS = 86_400_000;
const parseDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return date;
};

export interface CreateDebtParams {
  userId: string;
  name: string;
  creditor?: string;
  originalAmountKopecks: money.Money;
  currentBalanceKopecks?: money.Money;
  minimumPaymentKopecks?: money.Money;
  dueDate?: string;
  interestRatePercent?: number;
  schedule?: DebtSchedule;
  priority?: number;
  notes?: string;
}

function validateSchedule(schedule?: DebtSchedule) {
  if (!schedule) return;
  if (schedule.intervalDays !== undefined && (!Number.isInteger(schedule.intervalDays) || schedule.intervalDays <= 0)) throw new Error("schedule.intervalDays must be positive");
  if (schedule.dayOfMonth !== undefined && (!Number.isInteger(schedule.dayOfMonth) || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31)) throw new Error("schedule.dayOfMonth must be between 1 and 31");
}

export async function createDebt(params: CreateDebtParams) {
  money.validate(params.originalAmountKopecks);
  if (!money.isPositive(params.originalAmountKopecks)) throw new Error("Original debt amount must be positive");
  const current = params.currentBalanceKopecks ?? params.originalAmountKopecks;
  money.validate(current);
  if (current < 0 || current > params.originalAmountKopecks) throw new Error("Current debt balance is invalid");
  if (params.minimumPaymentKopecks !== undefined && params.minimumPaymentKopecks < 0) throw new Error("Minimum payment cannot be negative");
  if (params.interestRatePercent !== undefined && params.interestRatePercent < 0) throw new Error("Interest rate cannot be negative");
  if (!params.name.trim() || params.name.length > 256) throw new Error("Debt name is required");
  if (params.dueDate) parseDate(params.dueDate);
  validateSchedule(params.schedule);
  const [created] = await db.insert(debts).values({
    userId: params.userId,
    name: params.name.trim(),
    creditor: params.creditor,
    originalAmountKopecks: params.originalAmountKopecks,
    currentBalanceKopecks: current,
    minimumPaymentKopecks: params.minimumPaymentKopecks,
    dueDate: params.dueDate,
    interestRatePercent: params.interestRatePercent,
    schedule: params.schedule,
    priority: params.priority ?? 0,
    notes: params.notes,
    status: current === 0 ? "CLOSED" : "ACTIVE",
  }).returning();
  return created;
}

export async function getDebt(userId: string, debtId: string) {
  const debt = await db.query.debts.findFirst({ where: and(eq(debts.id, debtId), eq(debts.userId, userId)) });
  if (!debt) throw new Error("Debt not found");
  return debt;
}

export async function getDebts(userId: string) {
  return db.query.debts.findMany({ where: eq(debts.userId, userId), orderBy: [asc(debts.priority), desc(debts.currentBalanceKopecks)] });
}

export async function getDebtPayments(userId: string, debtId: string) {
  await getDebt(userId, debtId);
  return db.query.debtPayments.findMany({ where: and(eq(debtPayments.userId, userId), eq(debtPayments.debtId, debtId)), orderBy: desc(debtPayments.paidAt) });
}

export interface PayDebtParams {
  userId: string;
  debtId: string;
  amountKopecks: money.Money;
  paidAt?: Date;
  notes?: string;
  idempotencyKey?: string;
  expenseId?: string;
}

export async function payDebt(params: PayDebtParams) {
  money.validate(params.amountKopecks);
  if (!money.isPositive(params.amountKopecks)) throw new Error("Debt payment must be positive");
  if (params.idempotencyKey) {
    const existing = await db.query.debtPayments.findFirst({ where: and(eq(debtPayments.userId, params.userId), eq(debtPayments.idempotencyKey, params.idempotencyKey)) });
    if (existing) return existing;
  }
  try {
    return await db.transaction(async (tx) => {
      const debt = await tx.query.debts.findFirst({ where: and(eq(debts.id, params.debtId), eq(debts.userId, params.userId)) });
      if (!debt) throw new Error("Debt not found");
      if (params.amountKopecks > debt.currentBalanceKopecks) throw new Error("Debt payment exceeds current balance");
      const newBalance = debt.currentBalanceKopecks - params.amountKopecks;
      const [updated] = await tx.update(debts).set({ currentBalanceKopecks: newBalance, status: newBalance === 0 ? "CLOSED" : debt.status, version: sql`${debts.version} + 1`, updatedAt: new Date() }).where(and(eq(debts.id, debt.id), eq(debts.version, debt.version), eq(debts.currentBalanceKopecks, debt.currentBalanceKopecks))).returning();
      if (!updated) throw new Error("Debt changed concurrently; retry payment");
      const [payment] = await tx.insert(debtPayments).values({
        debtId: debt.id,
        userId: params.userId,
        expenseId: params.expenseId,
        amountKopecks: params.amountKopecks,
        previousBalanceKopecks: debt.currentBalanceKopecks,
        newBalanceKopecks: newBalance,
        paidAt: params.paidAt ?? new Date(),
        notes: params.notes,
        idempotencyKey: params.idempotencyKey,
      }).returning();
      return payment;
    });
  } catch (error) {
    if (params.idempotencyKey) {
      const existing = await db.query.debtPayments.findFirst({ where: and(eq(debtPayments.userId, params.userId), eq(debtPayments.idempotencyKey, params.idempotencyKey)) });
      if (existing) return existing;
    }
    throw error;
  }
}

export function calculateCatchUpAmount(debt: Pick<Debt, "currentBalanceKopecks" | "minimumPaymentKopecks" | "dueDate" | "schedule">, asOfDate: string): money.Money {
  parseDate(asOfDate);
  if (!debt.minimumPaymentKopecks || !debt.dueDate || debt.currentBalanceKopecks === 0) return 0;
  const due = parseDate(debt.dueDate);
  const asOf = parseDate(asOfDate);
  if (due >= asOf) return 0;
  const interval = debt.schedule?.intervalDays ?? 30;
  const missed = Math.max(1, Math.floor((asOf.getTime() - due.getTime()) / (interval * DAY_MS)) + 1);
  return Math.min(debt.currentBalanceKopecks, debt.minimumPaymentKopecks * missed);
}

export async function updateDebtStatus(userId: string, debtId: string, status: DebtStatus) {
  const [updated] = await db.update(debts).set({ status, updatedAt: new Date() }).where(and(eq(debts.id, debtId), eq(debts.userId, userId))).returning();
  if (!updated) throw new Error("Debt not found");
  return updated;
}
