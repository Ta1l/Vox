import { and, asc, eq, gte, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { incomeEntries } from "@/lib/db/schema/income";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { paymentOccurrences, type OccurrenceStatus } from "@/lib/db/schema/obligations";
import { debts } from "@/lib/db/schema/debts";
import { goals } from "@/lib/db/schema/goals";
import { recurringObligations } from "@/lib/db/schema/obligations";
import { getFinancialSnapshot } from "@/lib/domain/envelopes/envelopeService";
import * as money from "@/lib/money";

const USER_ID = "00000000-0000-0000-0000-000000000001";

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return date;
}

function dateKey(date: Date): string { return date.toISOString().slice(0, 10); }
function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}
function startOfWeek(value: string): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return dateKey(date);
}
function startOfMonth(value: string): string { return `${value.slice(0, 7)}-01`; }

export interface DashboardSnapshot {
  asOfDate: string;
  financial: Awaited<ReturnType<typeof getFinancialSnapshot>>;
  earnedIncome: { weekly: money.Money; monthly: money.Money };
  expenses: { weekly: money.Money; monthly: money.Money };
  nearestPayments: Array<{ id: string; name: string; dueDate: string; amountKopecks: money.Money; status: OccurrenceStatus; protectionLevel: "HARD" | "NEGOTIABLE" | "FLEXIBLE" }>;
  debts: Array<{ id: string; name: string; currentBalanceKopecks: money.Money; minimumPaymentKopecks: money.Money | null; dueDate: string | null; status: string }>;
  goals: Array<{ id: string; name: string; savedAmountKopecks: money.Money; targetAmountKopecks: money.Money; deadline: string | null; status: string }>;
  alerts: string[];
}

export async function getDashboardSnapshot(userId = USER_ID, asOfDate = dateKey(new Date())): Promise<DashboardSnapshot> {
  parseDate(asOfDate);
  const weekStart = startOfWeek(asOfDate);
  const monthStart = startOfMonth(asOfDate);
  const tomorrow = addDays(asOfDate, 1);
  const [financial, weekIncome, monthIncome, weekExpenses, monthExpenses, occurrences, debtRows, goalRows] = await Promise.all([
    getFinancialSnapshot(userId),
    db.select({ total: sql<number>`coalesce(sum(${incomeEntries.amountKopecks}), 0)` }).from(incomeEntries).where(and(eq(incomeEntries.userId, userId), ne(incomeEntries.status, "CANCELLED"), gte(incomeEntries.earnedAt, parseDate(weekStart)), lt(incomeEntries.earnedAt, parseDate(tomorrow)))),
    db.select({ total: sql<number>`coalesce(sum(${incomeEntries.amountKopecks}), 0)` }).from(incomeEntries).where(and(eq(incomeEntries.userId, userId), ne(incomeEntries.status, "CANCELLED"), gte(incomeEntries.earnedAt, parseDate(monthStart)), lt(incomeEntries.earnedAt, parseDate(tomorrow)))),
    db.select({ total: sql<number>`coalesce(sum(${expenseEntries.amountKopecks}), 0)` }).from(expenseEntries).where(and(eq(expenseEntries.userId, userId), gte(expenseEntries.expenseDate, parseDate(weekStart)), lt(expenseEntries.expenseDate, parseDate(tomorrow)))),
    db.select({ total: sql<number>`coalesce(sum(${expenseEntries.amountKopecks}), 0)` }).from(expenseEntries).where(and(eq(expenseEntries.userId, userId), gte(expenseEntries.expenseDate, parseDate(monthStart)), lt(expenseEntries.expenseDate, parseDate(tomorrow)))),
    db.select({ id: paymentOccurrences.id, name: recurringObligations.name, dueDate: paymentOccurrences.dueDate, amountKopecks: paymentOccurrences.amountKopecks, status: paymentOccurrences.status, protectionLevel: paymentOccurrences.protectionLevel }).from(paymentOccurrences).innerJoin(recurringObligations, eq(paymentOccurrences.obligationId, recurringObligations.id)).where(and(eq(paymentOccurrences.userId, userId), lte(paymentOccurrences.dueDate, addDays(asOfDate, 30)), sql`${paymentOccurrences.dueDate} >= ${addDays(asOfDate, -30)}`, sql`${paymentOccurrences.status} IN ('PENDING', 'OVERDUE')`)).orderBy(asc(paymentOccurrences.dueDate)).limit(5),
    db.query.debts.findMany({ where: and(eq(debts.userId, userId), ne(debts.status, "CLOSED")), orderBy: [asc(debts.dueDate), asc(debts.priority)], limit: 5 }),
    db.query.goals.findMany({ where: and(eq(goals.userId, userId), ne(goals.status, "ABANDONED"), ne(goals.status, "ACHIEVED")), orderBy: [asc(goals.deadline), asc(goals.priority)], limit: 5 }),
  ]);
  const alerts: string[] = [];
  if (occurrences.some((item) => item.status === "OVERDUE")) alerts.push("Есть просроченные платежи");
  if (financial.discretionaryAmountKopecks <= 0) alerts.push("Свободных денег для распределения нет");
  if (debtRows.some((debt) => debt.dueDate !== null && debt.dueDate < tomorrow)) alerts.push("Приближается срок платежа по долгу");
  return {
    asOfDate, financial,
    earnedIncome: { weekly: Number(weekIncome[0]?.total ?? 0), monthly: Number(monthIncome[0]?.total ?? 0) },
    expenses: { weekly: Number(weekExpenses[0]?.total ?? 0), monthly: Number(monthExpenses[0]?.total ?? 0) },
    nearestPayments: occurrences,
    debts: debtRows.map(({ id, name, currentBalanceKopecks, minimumPaymentKopecks, dueDate, status }) => ({ id, name, currentBalanceKopecks, minimumPaymentKopecks, dueDate, status })),
    goals: goalRows.map(({ id, name, savedAmountKopecks, targetAmountKopecks, deadline, status }) => ({ id, name, savedAmountKopecks, targetAmountKopecks, deadline, status })),
    alerts,
  };
}

export { USER_ID };
