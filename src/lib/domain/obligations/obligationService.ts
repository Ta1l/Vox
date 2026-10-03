import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as money from "@/lib/money";
import {
  paymentOccurrences,
  recurringObligations,
  type NewRecurringObligation,
  type ProtectionLevel,
  type RecurrenceConfig,
  type RecurrenceType,
  type RecurringObligation,
} from "@/lib/db/schema/obligations";

const DAY_MS = 86_400_000;

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return date;
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function nextMonthly(date: Date, dayOfMonth?: number): Date {
  const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const day = dayOfMonth ?? date.getUTCDate();
  nextMonth.setUTCDate(Math.min(day, daysInMonth(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth())));
  return nextMonth;
}

function validateConfig(type: RecurrenceType, config: RecurrenceConfig | null | undefined): void {
  if (type === "CUSTOM") {
    const validDays = Number.isInteger(config?.intervalDays) && (config?.intervalDays ?? 0) > 0;
    const validWeeks = Number.isInteger(config?.weekInterval) && (config?.weekInterval ?? 0) > 0 && Number.isInteger(config?.dayOfWeek) && (config?.dayOfWeek ?? -1) >= 0 && (config?.dayOfWeek ?? 7) <= 6;
    const valid = validDays || validWeeks;
    if (!valid) throw new Error("CUSTOM recurrence requires a positive intervalDays");
  }
  if (config?.dayOfWeek !== undefined && (!Number.isInteger(config.dayOfWeek) || config.dayOfWeek < 0 || config.dayOfWeek > 6)) {
    throw new Error("dayOfWeek must be between 0 and 6");
  }
  if (config?.dayOfMonth !== undefined && (!Number.isInteger(config.dayOfMonth) || config.dayOfMonth < 1 || config.dayOfMonth > 31)) {
    throw new Error("dayOfMonth must be between 1 and 31");
  }
}

export interface CreateObligationParams {
  userId: string;
  name: string;
  amountKopecks: money.Money;
  recurrenceType: RecurrenceType;
  recurrenceConfig?: RecurrenceConfig;
  protectionLevel: ProtectionLevel;
  startDate: string;
  endDate?: string;
}

export async function createObligation(params: CreateObligationParams) {
  money.validate(params.amountKopecks);
  if (!money.isPositive(params.amountKopecks)) throw new Error("Obligation amount must be positive");
  if (!params.name.trim() || params.name.length > 256) throw new Error("Obligation name is required");
  parseDate(params.startDate);
  if (params.endDate) {
    parseDate(params.endDate);
    if (params.endDate < params.startDate) throw new Error("endDate must not precede startDate");
  }
  validateConfig(params.recurrenceType, params.recurrenceConfig);

  const entry: NewRecurringObligation = {
    userId: params.userId,
    name: params.name.trim(),
    amountKopecks: params.amountKopecks,
    recurrenceType: params.recurrenceType,
    recurrenceConfig: params.recurrenceConfig,
    protectionLevel: params.protectionLevel,
    startDate: params.startDate,
    endDate: params.endDate,
  };
  const [created] = await db.insert(recurringObligations).values(entry).returning();
  return created;
}

export function calculateOccurrenceDates(
  obligation: Pick<RecurringObligation, "startDate" | "endDate" | "recurrenceType" | "recurrenceConfig">,
  throughDate: string,
): string[] {
  const start = parseDate(obligation.startDate);
  const through = parseDate(throughDate);
  const end = obligation.endDate ? parseDate(obligation.endDate) : through;
  const limit = through < end ? through : end;
  if (start > limit) return [];

  const dates: string[] = [];
  let current = start;
  const config = obligation.recurrenceConfig;
  while (current <= limit) {
    if (obligation.recurrenceType === "ONE_TIME") {
      dates.push(formatDate(current));
      break;
    }
    if (obligation.recurrenceType === "WEEKLY" || obligation.recurrenceType === "BIWEEKLY") {
      dates.push(formatDate(current));
      current = addDays(current, obligation.recurrenceType === "BIWEEKLY" ? 14 : 7);
    } else if (obligation.recurrenceType === "DAILY") {
      dates.push(formatDate(current));
      current = addDays(current, 1);
    } else if (obligation.recurrenceType === "MONTHLY") {
      dates.push(formatDate(current));
      current = nextMonthly(current, config?.dayOfMonth ?? start.getUTCDate());
    } else {
      if (config?.weekInterval && config.dayOfWeek !== undefined) {
        const offset = (config.dayOfWeek - current.getUTCDay() + 7) % 7;
        current = addDays(current, offset);
        if (current > limit) break;
        dates.push(formatDate(current));
        current = addDays(current, config.weekInterval * 7);
        continue;
      }
      dates.push(formatDate(current));
      current = addDays(current, config?.intervalDays ?? 1);
    }
  }
  return dates;
}

export async function generateOccurrences(obligationId: string, userId: string, throughDate: string) {
  const obligation = await db.query.recurringObligations.findFirst({ where: and(eq(recurringObligations.id, obligationId), eq(recurringObligations.userId, userId)) });
  if (!obligation) throw new Error("Obligation not found");
  if (!obligation.isActive) throw new Error("Obligation is inactive");
  const dates = calculateOccurrenceDates(obligation, throughDate);
  if (dates.length === 0) return [];

  return db.transaction(async (tx) => {
    await tx.insert(paymentOccurrences).values(dates.map((dueDate) => ({
      userId,
      obligationId,
      amountKopecks: obligation.amountKopecks,
      dueDate,
      protectionLevel: obligation.protectionLevel,
    }))).onConflictDoNothing({ target: [paymentOccurrences.obligationId, paymentOccurrences.dueDate] });
    return tx.query.paymentOccurrences.findMany({ where: eq(paymentOccurrences.obligationId, obligationId), orderBy: asc(paymentOccurrences.dueDate) });
  });
}

export async function getOccurrences(userId: string, fromDate: string, toDate: string) {
  parseDate(fromDate); parseDate(toDate);
  return db.query.paymentOccurrences.findMany({ where: and(eq(paymentOccurrences.userId, userId), gte(paymentOccurrences.dueDate, fromDate), lte(paymentOccurrences.dueDate, toDate)), orderBy: asc(paymentOccurrences.dueDate) });
}

export async function markOverdue(userId: string, today: string) {
  parseDate(today);
  return db.update(paymentOccurrences).set({ status: "OVERDUE", updatedAt: new Date() }).where(and(eq(paymentOccurrences.userId, userId), eq(paymentOccurrences.status, "PENDING"), sql`${paymentOccurrences.dueDate} < ${today}`)).returning();
}

export async function markPaid(userId: string, occurrenceId: string, paidAt = new Date()) {
  const [updated] = await db.update(paymentOccurrences).set({ status: "PAID", paidAt, updatedAt: new Date() }).where(and(eq(paymentOccurrences.id, occurrenceId), eq(paymentOccurrences.userId, userId), sql`${paymentOccurrences.status} IN ('PENDING', 'OVERDUE')`)).returning();
  if (!updated) throw new Error("Occurrence not found or already immutable");
  return updated;
}
