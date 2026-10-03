import { and, asc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { budgetAllocations, planningCycles, type AllocationTargetType, type CycleStatus } from "@/lib/db/schema/planning";
import { incomeEntries } from "@/lib/db/schema/income";
import { debts } from "@/lib/db/schema/debts";
import { goals } from "@/lib/db/schema/goals";
import { budgetEnvelopes } from "@/lib/db/schema/envelopes";
import { paymentOccurrences } from "@/lib/db/schema/obligations";
import { getFinancialSnapshot } from "@/lib/domain/envelopes/envelopeService";
import * as money from "@/lib/money";

const parseDate = (value: string) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid date");
  return date;
};

export interface CreateCycleParams {
  userId: string;
  startDate: string;
  endDate: string;
  status?: CycleStatus;
}

export async function createPlanningCycle(params: CreateCycleParams) {
  parseDate(params.startDate); parseDate(params.endDate);
  if (params.endDate <= params.startDate) throw new Error("endDate must be after startDate");
  const status = params.status ?? "ACTIVE";
  if (status === "ACTIVE") {
    const existing = await db.query.planningCycles.findFirst({ where: and(eq(planningCycles.userId, params.userId), eq(planningCycles.status, "ACTIVE")) });
    if (existing) throw new Error("An active planning cycle already exists");
  }
  const [snapshot, expected] = await Promise.all([
    getFinancialSnapshot(params.userId),
    db.select({ total: sql<number>`coalesce(sum(${incomeEntries.amountKopecks}), 0)` }).from(incomeEntries).where(and(eq(incomeEntries.userId, params.userId), sql`${incomeEntries.status} IN ('EARNED', 'IN_TRANSIT', 'DELAYED')`, gte(incomeEntries.expectedAt, params.startDate), lte(incomeEntries.expectedAt, params.endDate))),
  ]);
  const [created] = await db.insert(planningCycles).values({ userId: params.userId, startDate: params.startDate, endDate: params.endDate, openingBalanceKopecks: snapshot.availableCashKopecks, expectedIncomeKopecks: Number(expected[0]?.total ?? 0), status }).returning();
  return created;
}

export async function getPlanningCycle(userId: string, cycleId: string) {
  const cycle = await db.query.planningCycles.findFirst({ where: and(eq(planningCycles.id, cycleId), eq(planningCycles.userId, userId)) });
  if (!cycle) throw new Error("Planning cycle not found");
  return cycle;
}

export async function getPlanningCycles(userId: string) {
  return db.query.planningCycles.findMany({ where: eq(planningCycles.userId, userId), orderBy: [asc(planningCycles.startDate)] });
}

export async function updatePlanningCycleStatus(userId: string, cycleId: string, status: CycleStatus) {
  if (status === "ACTIVE") throw new Error("Use createPlanningCycle to activate a cycle");
  const [updated] = await db.update(planningCycles).set({ status, updatedAt: new Date() }).where(and(eq(planningCycles.id, cycleId), eq(planningCycles.userId, userId), ne(planningCycles.status, "COMPLETED"), ne(planningCycles.status, "CANCELLED"))).returning();
  if (!updated) throw new Error("Planning cycle not found or immutable");
  return updated;
}

async function assertTarget(userId: string, targetType: AllocationTargetType, targetId: string | undefined) {
  if (targetType === "GENERAL") { if (targetId) throw new Error("GENERAL allocation cannot have targetId"); return; }
  if (!targetId) throw new Error("targetId is required");
  const target = targetType === "DEBT"
    ? await db.query.debts.findFirst({ where: and(eq(debts.id, targetId), eq(debts.userId, userId)) })
    : targetType === "GOAL"
      ? await db.query.goals.findFirst({ where: and(eq(goals.id, targetId), eq(goals.userId, userId)) })
      : targetType === "ENVELOPE"
        ? await db.query.budgetEnvelopes.findFirst({ where: and(eq(budgetEnvelopes.id, targetId), eq(budgetEnvelopes.userId, userId)) })
        : await db.query.paymentOccurrences.findFirst({ where: and(eq(paymentOccurrences.id, targetId), eq(paymentOccurrences.userId, userId)) });
  if (!target) throw new Error("Allocation target not found");
}

async function getCycleObligationsTotal(userId: string, cycle: { startDate: string; endDate: string }) {
  const result = await db.select({ total: sql<number>`coalesce(sum(${paymentOccurrences.amountKopecks}), 0)` }).from(paymentOccurrences).where(and(eq(paymentOccurrences.userId, userId), gte(paymentOccurrences.dueDate, cycle.startDate), lte(paymentOccurrences.dueDate, cycle.endDate), sql`${paymentOccurrences.status} IN ('PENDING', 'OVERDUE')`));
  return Number(result[0]?.total ?? 0);
}

export async function createAllocation(params: { userId: string; cycleId: string; targetType: AllocationTargetType; targetId?: string; amountKopecks: money.Money; reason?: string; isAiGenerated?: boolean; snapshotVersion?: string; idempotencyKey?: string }) {
  money.validate(params.amountKopecks);
  if (!money.isPositive(params.amountKopecks)) throw new Error("Allocation must be positive");
  const cycle = await getPlanningCycle(params.userId, params.cycleId);
  if (cycle.status !== "ACTIVE" && cycle.status !== "DRAFT") throw new Error("Cycle is not allocatable");
  if (params.idempotencyKey) {
    const existing = await db.query.budgetAllocations.findFirst({ where: and(eq(budgetAllocations.cycleId, cycle.id), eq(budgetAllocations.idempotencyKey, params.idempotencyKey)) });
    if (existing) return existing;
  }
  await assertTarget(params.userId, params.targetType, params.targetId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from users where id = ${params.userId} for update`);
    await tx.execute(sql`select id from planning_cycles where id = ${cycle.id} for update`);
    const snapshot = await getFinancialSnapshot(params.userId);
    const obligations = await getCycleObligationsTotal(params.userId, cycle);
    const available = Math.max(0, snapshot.availableCashKopecks - snapshot.protectedAmountKopecks);
    if (params.idempotencyKey) {
      const existing = await tx.query.budgetAllocations.findFirst({ where: and(eq(budgetAllocations.cycleId, cycle.id), eq(budgetAllocations.idempotencyKey, params.idempotencyKey)) });
      if (existing) return existing;
    }
    const allocated = await tx.query.budgetAllocations.findMany({ where: eq(budgetAllocations.cycleId, cycle.id) });
    const generalLocked = allocated.filter((item) => item.targetType !== "OBLIGATION").reduce((sum, item) => sum + item.amountKopecks, 0);
    const allocatedToObligations = allocated.filter((item) => item.targetType === "OBLIGATION").reduce((sum, item) => sum + item.amountKopecks, 0);
    const obligationLocked = Math.max(obligations, allocatedToObligations);
    const needed = params.targetType === "OBLIGATION"
      ? generalLocked + Math.max(obligationLocked, allocatedToObligations + params.amountKopecks)
      : generalLocked + params.amountKopecks + obligationLocked;
    if (needed > available) throw new Error("Allocation exceeds available cycle balance");
    const [created] = await tx.insert(budgetAllocations).values({ cycleId: cycle.id, userId: params.userId, targetType: params.targetType, targetId: params.targetId, amountKopecks: params.amountKopecks, reason: params.reason, isAiGenerated: params.isAiGenerated ?? false, snapshotVersion: params.snapshotVersion, idempotencyKey: params.idempotencyKey }).returning();
    return created;
  });
}

export async function getCycleSummary(userId: string, cycleId: string) {
  const cycle = await getPlanningCycle(userId, cycleId);
  const allocations = await db.query.budgetAllocations.findMany({ where: and(eq(budgetAllocations.userId, userId), eq(budgetAllocations.cycleId, cycleId)), orderBy: asc(budgetAllocations.createdAt) });
  const snapshot = await getFinancialSnapshot(userId);
  const obligationsKopecks = await getCycleObligationsTotal(userId, cycle);
  const allocated = allocations.reduce((sum, item) => sum + item.amountKopecks, 0);
  const obligationAllocations = allocations.filter((item) => item.targetType === "OBLIGATION").reduce((sum, item) => sum + item.amountKopecks, 0);
  const availableToAllocate = Math.max(0, snapshot.availableCashKopecks - snapshot.protectedAmountKopecks - Math.max(obligationsKopecks, obligationAllocations) - (allocated - obligationAllocations));
  return { cycle, allocations, obligationsKopecks, allocatedKopecks: allocated, availableToAllocateKopecks: availableToAllocate };
}
