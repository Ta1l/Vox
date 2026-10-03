import { db } from "@/lib/db/client";
import { expenseEntries, type NewExpenseEntry } from "@/lib/db/schema/expenses";
import { eq, and, desc, sql } from "drizzle-orm";
import * as money from "@/lib/money";

/**
 * Expense domain service
 *
 * RULE-E1: Expense immediately reduces available balance
 */

export interface CreateExpenseParams {
  userId: string;
  amountKopecks: money.Money;
  category: string;
  title: string;
  comment?: string;
  expenseDate: Date;
}

export async function createExpense(params: CreateExpenseParams) {
  money.validate(params.amountKopecks);

  if (!money.isPositive(params.amountKopecks)) {
    throw new Error("Expense amount must be positive");
  }

  const entry: NewExpenseEntry = {
    userId: params.userId,
    amountKopecks: params.amountKopecks,
    category: params.category,
    title: params.title,
    comment: params.comment,
    expenseDate: params.expenseDate,
  };

  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from users where id = ${params.userId} for update`);
    const [created] = await tx.insert(expenseEntries).values(entry).returning();
    return created;
  });
}

export async function getExpensesByUser(userId: string, category?: string) {
  const conditions = [eq(expenseEntries.userId, userId)];

  if (category) {
    conditions.push(eq(expenseEntries.category, category));
  }

  return db.query.expenseEntries.findMany({
    where: and(...conditions),
    orderBy: desc(expenseEntries.expenseDate),
  });
}

export async function getTotalExpenses(userId: string): Promise<money.Money> {
  const expenses = await db.query.expenseEntries.findMany({
    where: eq(expenseEntries.userId, userId),
  });

  return expenses.reduce((total, entry) => money.add(total, entry.amountKopecks), 0);
}
