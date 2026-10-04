import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { incomeEntries } from "@/lib/db/schema/income";
import { planningCycles, budgetAllocations } from "@/lib/db/schema/planning";
import { paymentOccurrences, recurringObligations } from "@/lib/db/schema/obligations";
import { budgetEnvelopes } from "@/lib/db/schema/envelopes";
import * as incomeService from "@/lib/domain/income/incomeService";
import * as obligationService from "@/lib/domain/obligations/obligationService";
import * as planningService from "@/lib/domain/planning/planningService";

describe("planning cycles", () => {
  let userId: string;
  let transitId: string;
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ email: `planning-${Date.now()}@example.com`, name: "Planning Test", passwordHash: "fake" }).returning();
    userId = user.id;
    const received = await incomeService.createIncome({ userId, amountKopecks: 100000, earnedAt: new Date("2026-10-01T00:00:00Z") });
    await incomeService.updateIncomeStatus({ incomeId: received.id, userId, newStatus: "RECEIVED", receivedAt: new Date("2026-10-01T01:00:00Z") });
    const expected = await incomeService.createIncome({ userId, amountKopecks: 50000, earnedAt: new Date("2026-10-01T00:00:00Z"), expectedAt: "2026-10-05" });
    transitId = expected.id;
    await incomeService.updateIncomeStatus({ incomeId: expected.id, userId, newStatus: "IN_TRANSIT" });
  });
  afterAll(async () => {
    await db.delete(budgetAllocations).where(eq(budgetAllocations.userId, userId));
    await db.delete(planningCycles).where(eq(planningCycles.userId, userId));
    await db.delete(paymentOccurrences).where(eq(paymentOccurrences.userId, userId));
    await db.delete(recurringObligations).where(eq(recurringObligations.userId, userId));
    await db.delete(budgetEnvelopes).where(eq(budgetEnvelopes.userId, userId));
    await db.delete(incomeEntries).where(eq(incomeEntries.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("snapshots available opening balance and expected income separately", async () => {
    const cycle = await planningService.createPlanningCycle({ userId, startDate: "2026-10-03", endDate: "2026-10-10" });
    expect(cycle).toMatchObject({ openingBalanceKopecks: 100000, expectedIncomeKopecks: 50000, status: "ACTIVE" });
    await expect(planningService.createPlanningCycle({ userId, startDate: "2026-10-11", endDate: "2026-10-18" })).rejects.toThrow("active");
  });

  it("reserves cycle obligations and rejects allocations over remaining money", async () => {
    const obligation = await obligationService.createObligation({ userId, name: "Rent", amountKopecks: 30000, recurrenceType: "ONE_TIME", protectionLevel: "HARD", startDate: "2026-10-06" });
    await obligationService.generateOccurrences(obligation.id, userId, "2026-10-10");
    const cycle = await planningService.getPlanningCycles(userId).then((items) => items[0]);
    const allocation = await planningService.createAllocation({ userId, cycleId: cycle.id, targetType: "GENERAL", amountKopecks: 70000, idempotencyKey: "first" });
    expect(allocation.amountKopecks).toBe(70000);
    await expect(planningService.createAllocation({ userId, cycleId: cycle.id, targetType: "GENERAL", amountKopecks: 1 })).rejects.toThrow("exceeds");
    await expect(planningService.createAllocation({ userId, cycleId: cycle.id, targetType: "GENERAL", amountKopecks: 70000, idempotencyKey: "first" })).resolves.toMatchObject({ id: allocation.id });
    await expect(planningService.getCycleSummary(userId, cycle.id)).resolves.toMatchObject({ obligationsKopecks: 30000, allocatedKopecks: 70000, availableToAllocateKopecks: 0 });
  });

  it("rejects foreign targets and invalid date ranges", async () => {
    await expect(planningService.createPlanningCycle({ userId, startDate: "2026-10-10", endDate: "2026-10-10" })).rejects.toThrow("after");
    const cycle = await planningService.getPlanningCycles(userId).then((items) => items[0]);
    await expect(planningService.createAllocation({ userId, cycleId: cycle.id, targetType: "GOAL", targetId: "00000000-0000-0000-0000-000000000001", amountKopecks: 1 })).rejects.toThrow("target");
  });

  it("does not double count an allocation assigned to an obligation", async () => {
    const cycle = await planningService.createPlanningCycle({ userId, startDate: "2026-11-01", endDate: "2026-11-08", status: "DRAFT" });
    const obligation = await obligationService.createObligation({ userId, name: "Utilities", amountKopecks: 30000, recurrenceType: "ONE_TIME", protectionLevel: "HARD", startDate: "2026-11-03" });
    const [occurrence] = await obligationService.generateOccurrences(obligation.id, userId, "2026-11-08");
    await planningService.createAllocation({ userId, cycleId: cycle.id, targetType: "OBLIGATION", targetId: occurrence.id, amountKopecks: 30000 });
    await expect(planningService.createAllocation({ userId, cycleId: cycle.id, targetType: "GENERAL", amountKopecks: 70000 })).resolves.toBeTruthy();
  });

  it("creates a proposal batch atomically and idempotently", async () => {
    const cycle = await planningService.createPlanningCycle({ userId, startDate: "2027-01-01", endDate: "2027-01-08", status: "DRAFT" });
    const allocations = [{ targetType: "GENERAL" as const, amountKopecks: 60000, idempotencyKey: "batch-a" }, { targetType: "GENERAL" as const, amountKopecks: 60000, idempotencyKey: "batch-b" }];
    await expect(planningService.createAllocations({ userId, cycleId: cycle.id, allocations })).rejects.toThrow("exceeds");
    await expect(planningService.getCycleSummary(userId, cycle.id)).resolves.toMatchObject({ allocatedKopecks: 0 });
    const valid = allocations.map((item) => ({ ...item, amountKopecks: 30000 }));
    const created = await planningService.createAllocations({ userId, cycleId: cycle.id, allocations: valid });
    expect(created).toHaveLength(2);
    await expect(planningService.createAllocations({ userId, cycleId: cycle.id, allocations: valid })).resolves.toEqual(created);
  });

  it("allows genuinely received income after the immutable opening snapshot", async () => {
    const cycle = await planningService.createPlanningCycle({ userId, startDate: "2026-12-01", endDate: "2026-12-08", status: "DRAFT" });
    expect(cycle.openingBalanceKopecks).toBe(100000);
    await expect(planningService.createAllocation({ userId, cycleId: cycle.id, targetType: "GENERAL", amountKopecks: 120000 })).rejects.toThrow("exceeds");
    await incomeService.updateIncomeStatus({ incomeId: transitId, userId, newStatus: "RECEIVED", receivedAt: new Date("2026-12-02T00:00:00Z") });
    await expect(planningService.createAllocation({ userId, cycleId: cycle.id, targetType: "GENERAL", amountKopecks: 120000 })).resolves.toBeTruthy();
    expect((await planningService.getPlanningCycle(userId, cycle.id)).openingBalanceKopecks).toBe(100000);
  });
});
