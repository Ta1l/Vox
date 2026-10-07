import { db } from "@/lib/db/client";
import { incomeEntries } from "@/lib/db/schema/income";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { paymentOccurrences, recurringObligations } from "@/lib/db/schema/obligations";
import { eq, and, gte, lt, lte } from "drizzle-orm";
import * as money from "@/lib/money";

export interface DayEvent {
  date: string; // YYYY-MM-DD
  earnedIncome: money.Money;
  inTransitIncome: money.Money;
  receivedIncome: money.Money;
  expectedIncome: money.Money;
  expenses: money.Money;
  scheduledPayments: Array<{
    name: string;
    amountKopecks: money.Money;
    status: "PENDING" | "PAID" | "OVERDUE" | "SKIPPED";
    protectionLevel: "HARD" | "NEGOTIABLE" | "FLEXIBLE";
  }>;
}

export async function getMonthEvents(
  userId: string,
  year: number,
  month: number
): Promise<DayEvent[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

  const [incomes, expenses, occurrences] = await Promise.all([
    // Income can produce events on earnedAt, expectedAt, and receivedAt.
    // Fetch the user's entries once so events are not lost when those dates
    // fall in different months.
    db.query.incomeEntries.findMany({
      where: eq(incomeEntries.userId, userId),
    }),
    db.query.expenseEntries.findMany({
      where: and(
        eq(expenseEntries.userId, userId),
        gte(expenseEntries.expenseDate, start),
        lt(expenseEntries.expenseDate, end)
      ),
    }),
    db.select({
      dueDate: paymentOccurrences.dueDate,
      amountKopecks: paymentOccurrences.amountKopecks,
      status: paymentOccurrences.status,
      protectionLevel: paymentOccurrences.protectionLevel,
      name: recurringObligations.name,
    }).from(paymentOccurrences)
      .innerJoin(recurringObligations, eq(paymentOccurrences.obligationId, recurringObligations.id))
      .where(and(
        eq(paymentOccurrences.userId, userId),
        gte(paymentOccurrences.dueDate, startDate),
        lte(paymentOccurrences.dueDate, endDate),
      )),
  ]);

  const days = new Map<string, DayEvent>();

  const ensureDay = (dateKey: string) => days.get(dateKey) || {
      date: dateKey,
      earnedIncome: 0,
      inTransitIncome: 0,
      receivedIncome: 0,
      expectedIncome: 0,
      expenses: 0,
      scheduledPayments: [],
    };

  const inMonth = (dateKey: string) => dateKey >= startDate && dateKey <= endDate;

  for (const income of incomes) {
    const earnedDate = income.earnedAt.toISOString().split("T")[0];
    if (income.status !== "CANCELLED" && inMonth(earnedDate)) {
      const day = ensureDay(earnedDate);
      day.earnedIncome = money.add(day.earnedIncome, income.amountKopecks);
      if (income.status === "EARNED" || income.status === "IN_TRANSIT") day.inTransitIncome = money.add(day.inTransitIncome, income.amountKopecks);
      days.set(earnedDate, day);
    }

    if (income.status === "RECEIVED" && income.receivedAt) {
      const receivedDate = income.receivedAt.toISOString().split("T")[0];
      if (inMonth(receivedDate)) {
        const day = ensureDay(receivedDate);
        day.receivedIncome = money.add(day.receivedIncome, income.amountKopecks);
        days.set(receivedDate, day);
      }
    } else if (income.status === "IN_TRANSIT" || income.status === "EARNED" || income.status === "DELAYED") {
      // Entries without an expected date remain visible on their earned date.
      const expectedDate = income.expectedAt ?? earnedDate;
      if (!inMonth(expectedDate)) continue;
      const day = ensureDay(expectedDate);
      day.expectedIncome = money.add(day.expectedIncome, income.amountKopecks);
      days.set(expectedDate, day);
    }
  }

  for (const expense of expenses) {
    const dateKey = expense.expenseDate.toISOString().split("T")[0];
    if (!inMonth(dateKey)) continue;
    const day = ensureDay(dateKey);

    day.expenses = money.add(day.expenses, expense.amountKopecks);
    days.set(dateKey, day);
  }

  for (const occurrence of occurrences) {
    const day = ensureDay(occurrence.dueDate);
    day.scheduledPayments.push({
      name: occurrence.name,
      amountKopecks: occurrence.amountKopecks,
      status: occurrence.status,
      protectionLevel: occurrence.protectionLevel,
    });
    days.set(occurrence.dueDate, day);
  }

  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}
