import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { incomeEntries } from "@/lib/db/schema/income";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { budgetEnvelopes } from "@/lib/db/schema/envelopes";
import * as incomeService from "@/lib/domain/income/incomeService";
import * as expenseService from "@/lib/domain/expenses/expenseService";
import * as service from "@/lib/domain/envelopes/envelopeService";

describe("Envelope financial engine", () => {
  let userId: string;
  beforeAll(async () => { const [user] = await db.insert(users).values({ email: `envelopes-${Date.now()}@example.com`, name: "Envelope Test", passwordHash: "fake" }).returning(); userId = user.id; });
  afterAll(async () => { await db.delete(budgetEnvelopes).where(eq(budgetEnvelopes.userId, userId)); await db.delete(incomeEntries).where(eq(incomeEntries.userId, userId)); await db.delete(expenseEntries).where(eq(expenseEntries.userId, userId)); await db.delete(users).where(eq(users.id, userId)); });
  it("excludes in-transit income and HARD funds from discretionary", async () => {
    const received = await incomeService.createIncome({ userId, amountKopecks: 100000, earnedAt: new Date("2026-01-01T00:00:00Z") });
    await incomeService.updateIncomeStatus({ incomeId: received.id, userId, newStatus: "RECEIVED", receivedAt: new Date("2026-01-01T00:00:00Z") });
    const inTransit = await incomeService.createIncome({ userId, amountKopecks: 50000, earnedAt: new Date("2026-01-01T00:00:00Z"), expectedAt: "2026-01-03" });
    await incomeService.updateIncomeStatus({ incomeId: inTransit.id, userId, newStatus: "IN_TRANSIT" });
    const envelope = await service.createEnvelope({ userId, name: "Rent", targetAmountKopecks: 30000, protectionLevel: "HARD" });
    await service.fundEnvelope(userId, envelope.id, 30000);
    await expect(service.fundEnvelope(userId, envelope.id, 80000)).rejects.toThrow("discretionary");
    const snapshot = await service.getFinancialSnapshot(userId);
    expect(snapshot.availableCashKopecks).toBe(100000);
    expect(snapshot.incomeInTransitKopecks).toBe(50000);
    expect(snapshot.hardProtectedAmountKopecks).toBe(30000);
    expect(snapshot.discretionaryAmountKopecks).toBe(70000);
  });
  it("subtracts expenses and prevents spending beyond funded envelope", async () => {
    await expenseService.createExpense({ userId, amountKopecks: 10000, category: "Food", title: "Lunch", expenseDate: new Date("2026-01-02T00:00:00Z") });
    const envelope = await service.createEnvelope({ userId, name: "Food", targetAmountKopecks: 10000, protectionLevel: "NEGOTIABLE" });
    await service.fundEnvelope(userId, envelope.id, 5000);
    await expect(service.spendEnvelope(userId, envelope.id, 6000)).rejects.toThrow("insufficient");
  });
});
