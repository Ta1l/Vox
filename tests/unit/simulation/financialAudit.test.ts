import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { incomeEntries } from "@/lib/db/schema/income";
import { budgetEnvelopes } from "@/lib/db/schema/envelopes";
import { expenseEntries } from "@/lib/db/schema/expenses";
import * as incomeService from "@/lib/domain/income/incomeService";
import * as envelopeService from "@/lib/domain/envelopes/envelopeService";

describe("financial allocation concurrency audit", () => {
  let userId: string;
  let firstEnvelope: string;
  let secondEnvelope: string;
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ email: `audit-${Date.now()}@example.com`, name: "Audit", passwordHash: "fake" }).returning();
    userId = user.id;
    const income = await incomeService.createIncome({ userId, amountKopecks: 100000, earnedAt: new Date("2026-01-01T00:00:00Z") });
    await incomeService.updateIncomeStatus({ incomeId: income.id, userId, newStatus: "RECEIVED", receivedAt: new Date("2026-01-01T00:00:00Z") });
    firstEnvelope = (await envelopeService.createEnvelope({ userId, name: "First" })).id;
    secondEnvelope = (await envelopeService.createEnvelope({ userId, name: "Second" })).id;
  });
  afterAll(async () => {
    await db.delete(budgetEnvelopes).where(eq(budgetEnvelopes.userId, userId));
    await db.delete(incomeEntries).where(eq(incomeEntries.userId, userId));
    await db.delete(expenseEntries).where(eq(expenseEntries.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });
  it("serializes competing envelope funding against one user balance", async () => {
    const results = await Promise.allSettled([
      envelopeService.fundEnvelope(userId, firstEnvelope, 70000),
      envelopeService.fundEnvelope(userId, secondEnvelope, 70000),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const snapshot = await envelopeService.getFinancialSnapshot(userId);
    expect(snapshot.protectedAmountKopecks).toBe(70000);
    expect(snapshot.discretionaryAmountKopecks).toBe(30000);
  });
});
