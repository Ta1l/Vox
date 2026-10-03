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
    db.query.incomeEntries.findMany({
      where: and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.earnedAt, start),
        lte(incomeEntries.earnedAt, end)
      ),
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

  for (const income of incomes) {
    const dateKey = income.earnedAt.toISOString().split("T")[0];
    const day = days.get(dateKey) || {
      date: dateKey,
      earnedIncome: 0,
      receivedIncome: 0,
      expectedIncome: 0,
      expenses: 0,
    };

    day.earnedIncome = money.add(day.earnedIncome, income.amountKopecks);

    if (income.status === "RECEIVED") {
      day.receivedIncome = money.add(day.receivedIncome, income.amountKopecks);
    } else if (income.status === "IN_TRANSIT" || income.status === "EARNED") {
      day.expectedIncome = money.add(day.expectedIncome, income.amountKopecks);
    }

    days.set(dateKey, day);
  }

  for (const expense of expenses) {
    const dateKey = expense.expenseDate.toISOString().split("T")[0];
    const day = days.get(dateKey) || {
      date: dateKey,
      earnedIncome: 0,
      receivedIncome: 0,
      expectedIncome: 0,
      expenses: 0,
    };

    day.expenses = money.add(day.expenses, expense.amountKopecks);
    days.set(dateKey, day);
  }

  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}
