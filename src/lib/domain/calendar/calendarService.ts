import { db } from "@/lib/db/client";
import { incomeEntries } from "@/lib/db/schema/income";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { eq, and, gte, lte } from "drizzle-orm";
import * as money from "@/lib/money";

export interface DayEvent {
  date: string; // YYYY-MM-DD
  earnedIncome: money.Money;
  receivedIncome: money.Money;
  expectedIncome: money.Money;
  expenses: money.Money;
}

export async function getMonthEvents(
  userId: string,
  year: number,
  month: number
): Promise<DayEvent[]> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [incomes, expenses] = await Promise.all([
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
        lte(expenseEntries.expenseDate, end)
      ),
    }),
  ]);

  const days = new Map<string, DayEvent>();

  const ensureDay = (dateKey: string) => days.get(dateKey) || {
      date: dateKey,
      earnedIncome: 0,
      receivedIncome: 0,
      expectedIncome: 0,
      expenses: 0,
    };

  const inMonth = (dateKey: string) => dateKey >= startDate && dateKey <= endDate;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

  for (const income of incomes) {
    const earnedDate = income.earnedAt.toISOString().split("T")[0];
    if (inMonth(earnedDate)) {
      const day = ensureDay(earnedDate);
      day.earnedIncome = money.add(day.earnedIncome, income.amountKopecks);
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

  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}
