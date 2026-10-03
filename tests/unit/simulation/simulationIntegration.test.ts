import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { incomeEntries } from "@/lib/db/schema/income";
import { planningCycles, budgetAllocations } from "@/lib/db/schema/planning";
import { debts, debtPayments } from "@/lib/db/schema/debts";
import * as incomeService from "@/lib/domain/income/incomeService";
import * as planningService from "@/lib/domain/planning/planningService";
import * as debtService from "@/lib/domain/debts/debtService";
import { simulateUserScenario } from "@/lib/domain/simulation/simulationService";

describe("DB-backed simulation", () => {
  let ownerId: string;
  let foreignId: string;
  let cycleId: string;
  let debtId: string;
  beforeAll(async () => {
    const [owner, foreign] = await db.insert(users).values([
      { email: `simulation-owner-${Date.now()}@example.com`, name: "Owner", passwordHash: "fake" },
      { email: `simulation-foreign-${Date.now()}@example.com`, name: "Foreign", passwordHash: "fake" },
    ]).returning();
    ownerId = owner.id; foreignId = foreign.id;
    const income = await incomeService.createIncome({ userId: ownerId, earnedAt: new Date("2026-10-01T00:00:00Z"), amountKopecks: 100000 });
    await incomeService.updateIncomeStatus({ incomeId: income.id, userId: ownerId, newStatus: "RECEIVED", receivedAt: new Date("2026-10-02T00:00:00Z") });
    cycleId = (await planningService.createPlanningCycle({ userId: ownerId, startDate: "2026-10-03", endDate: "2026-10-10" })).id;
    debtId = (await debtService.createDebt({ userId: ownerId, name: "Borrowed", originalAmountKopecks: 40000 })).id;
  });
  afterAll(async () => {
    await db.delete(budgetAllocations).where(eq(budgetAllocations.userId, ownerId));
    await db.delete(planningCycles).where(eq(planningCycles.userId, ownerId));
    await db.delete(debtPayments).where(eq(debtPayments.userId, ownerId));
    await db.delete(debts).where(eq(debts.userId, ownerId));
    await db.delete(incomeEntries).where(eq(incomeEntries.userId, ownerId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, foreignId));
  });
  it("simulates a partial debt payment without modifying persisted balances", async () => {
    const scenario = await simulateUserScenario(ownerId, cycleId, [{ type: "PAY_DEBT", debtId, amountKopecks: 12000 }]);
    expect(scenario.after).toEqual({ availableCashKopecks: 88000, discretionaryKopecks: 88000 });
    expect(scenario.debtBalances[debtId]).toBe(28000);
    expect((await debtService.getDebt(ownerId, debtId)).currentBalanceKopecks).toBe(40000);
    await expect(debtService.getDebtPayments(ownerId, debtId)).resolves.toHaveLength(0);
  });
  it("rejects foreign cycle and foreign debt IDs", async () => {
    await expect(simulateUserScenario(foreignId, cycleId, [])).rejects.toThrow("not found");
    await expect(simulateUserScenario(ownerId, cycleId, [{ type: "CLOSE_DEBT", debtId: foreignId }])).rejects.toThrow("Debt not found");
  });
});
