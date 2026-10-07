import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { budgetEnvelopes } from "@/lib/db/schema/envelopes";
import { debtPayments } from "@/lib/db/schema/debts";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { incomeEntries } from "@/lib/db/schema/income";
import type { ProtectionLevel } from "@/lib/db/schema/obligations";
import * as money from "@/lib/money";

export async function createEnvelope(params: { userId: string; name: string; description?: string; targetAmountKopecks?: money.Money; protectionLevel?: ProtectionLevel }) {
  const target = params.targetAmountKopecks ?? 0; money.validate(target); if (target < 0 || !params.name.trim()) throw new Error("Invalid envelope");
  const [created] = await db.insert(budgetEnvelopes).values({ userId: params.userId, name: params.name.trim(), description: params.description, targetAmountKopecks: target, protectionLevel: params.protectionLevel ?? "NEGOTIABLE" }).returning(); return created;
}
export async function getEnvelopes(userId: string) { return db.query.budgetEnvelopes.findMany({ where: and(eq(budgetEnvelopes.userId, userId), eq(budgetEnvelopes.isActive, true)) }); }
export async function fundEnvelope(userId: string, envelopeId: string, amountKopecks: money.Money) {
  money.validate(amountKopecks);
  if (!money.isPositive(amountKopecks)) throw new Error("Funding must be positive");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from users where id = ${userId} for update`);
    const snapshot = await getFinancialSnapshot(userId);
    if (amountKopecks > snapshot.discretionaryAmountKopecks) throw new Error("Funding exceeds discretionary balance");
    const [updated] = await tx.update(budgetEnvelopes).set({ fundedAmountKopecks: sql`${budgetEnvelopes.fundedAmountKopecks} + ${amountKopecks}`, updatedAt: new Date() }).where(and(eq(budgetEnvelopes.id, envelopeId), eq(budgetEnvelopes.userId, userId), eq(budgetEnvelopes.isActive, true))).returning();
    if (!updated) throw new Error("Envelope not found");
    return updated;
  });
}
export async function spendEnvelope(userId: string, envelopeId: string, amountKopecks: money.Money) { money.validate(amountKopecks); if (!money.isPositive(amountKopecks)) throw new Error("Spending must be positive"); const [updated] = await db.update(budgetEnvelopes).set({ spentAmountKopecks: sql`${budgetEnvelopes.spentAmountKopecks} + ${amountKopecks}`, updatedAt: new Date() }).where(and(eq(budgetEnvelopes.id, envelopeId), eq(budgetEnvelopes.userId, userId), eq(budgetEnvelopes.isActive, true), sql`${budgetEnvelopes.spentAmountKopecks} + ${amountKopecks} <= ${budgetEnvelopes.fundedAmountKopecks}`)).returning(); if (!updated) throw new Error("Envelope not found or insufficient funded amount"); return updated; }

export interface FinancialSnapshot { availableCashKopecks: money.Money; protectedAmountKopecks: money.Money; hardProtectedAmountKopecks: money.Money; discretionaryAmountKopecks: money.Money; incomeInTransitKopecks: money.Money; }
export async function getFinancialSnapshot(userId: string): Promise<FinancialSnapshot> {
  const [received, transit, expenses, debtOnlyPayments, envelopes] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${incomeEntries.amountKopecks}), 0)` }).from(incomeEntries).where(and(eq(incomeEntries.userId, userId), eq(incomeEntries.status, "RECEIVED"))),
    db.select({ total: sql<number>`coalesce(sum(${incomeEntries.amountKopecks}), 0)` }).from(incomeEntries).where(and(eq(incomeEntries.userId, userId), inArray(incomeEntries.status, ["EARNED", "IN_TRANSIT"]))),
    db.select({ total: sql<number>`coalesce(sum(${expenseEntries.amountKopecks}), 0)` }).from(expenseEntries).where(eq(expenseEntries.userId, userId)),
    db.select({ total: sql<number>`coalesce(sum(${debtPayments.amountKopecks}), 0)` }).from(debtPayments).where(and(eq(debtPayments.userId, userId), isNull(debtPayments.expenseId))),
    getEnvelopes(userId),
  ]);
  const available = Number(received[0]?.total ?? 0) - Number(expenses[0]?.total ?? 0) - Number(debtOnlyPayments[0]?.total ?? 0);
  const protectedAmount = envelopes.reduce((sum, item) => sum + item.fundedAmountKopecks - item.spentAmountKopecks, 0);
  const hardProtected = envelopes.filter((item) => item.protectionLevel === "HARD").reduce((sum, item) => sum + item.fundedAmountKopecks - item.spentAmountKopecks, 0);
  return { availableCashKopecks: available, protectedAmountKopecks: protectedAmount, hardProtectedAmountKopecks: hardProtected, discretionaryAmountKopecks: Math.max(0, available - protectedAmount), incomeInTransitKopecks: Number(transit[0]?.total ?? 0) };
}
