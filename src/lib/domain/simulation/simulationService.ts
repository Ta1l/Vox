import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { debts } from "@/lib/db/schema/debts";
import { goals } from "@/lib/db/schema/goals";
import { paymentOccurrences } from "@/lib/db/schema/obligations";
import { getFinancialSnapshot } from "@/lib/domain/envelopes/envelopeService";
import { getPlanningCycle } from "@/lib/domain/planning/planningService";
import { budgetAllocations } from "@/lib/db/schema/planning";
import * as money from "@/lib/money";

function validateSafeMoney(amount: number) {
  money.validate(amount);
  if (!Number.isSafeInteger(amount)) throw new Error("Money exceeds safe integer range");
}

export type SimulationAction =
  | { type: "PAY_DEBT"; debtId: string; amountKopecks: number }
  | { type: "CLOSE_DEBT"; debtId: string }
  | { type: "FUND_GOAL"; goalId: string; amountKopecks: number }
  | { type: "REDUCE_NEGOTIABLE"; occurrenceId: string; amountKopecks: number };

export interface SimulationInput {
  availableCashKopecks: number;
  protectedAmountKopecks: number;
  lockedAllocationsKopecks: number;
  incomeInTransitKopecks: number;
  obligations: Array<{ id: string; amountKopecks: number; protectionLevel: string }>;
  debts: Array<{ id: string; currentBalanceKopecks: number }>;
  goals: Array<{ id: string; savedAmountKopecks: number; targetAmountKopecks: number }>;
}

export function simulateFinancialScenario(input: SimulationInput, actions: SimulationAction[]) {
  for (const amount of [input.availableCashKopecks, input.protectedAmountKopecks, input.lockedAllocationsKopecks, input.incomeInTransitKopecks]) validateSafeMoney(amount);
  if (input.protectedAmountKopecks < 0 || input.lockedAllocationsKopecks < 0 || input.incomeInTransitKopecks < 0) throw new Error("Invalid financial snapshot");
  const debtsById = new Map(input.debts.map((debt) => { validateSafeMoney(debt.currentBalanceKopecks); if (debt.currentBalanceKopecks < 0) throw new Error("Invalid debt balance"); return [debt.id, debt.currentBalanceKopecks]; }));
  const goalsById = new Map(input.goals.map((goal) => { validateSafeMoney(goal.savedAmountKopecks); validateSafeMoney(goal.targetAmountKopecks); if (goal.savedAmountKopecks < 0 || goal.targetAmountKopecks < goal.savedAmountKopecks) throw new Error("Invalid goal balance"); return [goal.id, { ...goal }]; }));
  const obligationsById = new Map(input.obligations.map((item) => { validateSafeMoney(item.amountKopecks); if (item.amountKopecks < 0) throw new Error("Invalid obligation amount"); return [item.id, { ...item }]; }));
  let availableCash = input.availableCashKopecks;
  let reserved = input.protectedAmountKopecks + input.lockedAllocationsKopecks + input.obligations.reduce((sum, item) => sum + item.amountKopecks, 0);
  if (!Number.isSafeInteger(reserved)) throw new Error("Money exceeds safe integer range");
  const beforeFree = Math.max(0, availableCash - reserved);
  for (const action of actions) {
    if (action.type === "PAY_DEBT" || action.type === "CLOSE_DEBT") {
      const balance = debtsById.get(action.debtId);
      if (balance === undefined) throw new Error("Debt not found");
      const amount = action.type === "CLOSE_DEBT" ? balance : action.amountKopecks;
      validateSafeMoney(amount);
      if (amount <= 0 || amount > balance) throw new Error("Invalid debt payment");
      if (amount > Math.max(0, availableCash - reserved)) throw new Error("Payment exceeds discretionary balance");
      availableCash -= amount;
      debtsById.set(action.debtId, balance - amount);
    } else if (action.type === "FUND_GOAL") {
      const goal = goalsById.get(action.goalId);
      if (!goal) throw new Error("Goal not found");
      validateSafeMoney(action.amountKopecks);
      if (action.amountKopecks <= 0 || action.amountKopecks > goal.targetAmountKopecks - goal.savedAmountKopecks) throw new Error("Invalid goal contribution");
      if (action.amountKopecks > Math.max(0, availableCash - reserved)) throw new Error("Goal funding exceeds discretionary balance");
      goal.savedAmountKopecks += action.amountKopecks;
      reserved += action.amountKopecks;
    } else {
      const obligation = obligationsById.get(action.occurrenceId);
      if (!obligation) throw new Error("Obligation not found");
      validateSafeMoney(action.amountKopecks);
      if (obligation.protectionLevel !== "NEGOTIABLE" || action.amountKopecks <= 0 || action.amountKopecks > obligation.amountKopecks) throw new Error("Cannot reduce protected or invalid obligation");
      obligation.amountKopecks -= action.amountKopecks;
      reserved -= action.amountKopecks;
    }
    if (!Number.isSafeInteger(availableCash) || !Number.isSafeInteger(reserved)) throw new Error("Money exceeds safe integer range");
  }
  return {
    before: { availableCashKopecks: input.availableCashKopecks, discretionaryKopecks: beforeFree },
    after: { availableCashKopecks: availableCash, discretionaryKopecks: Math.max(0, availableCash - reserved) },
    discretionaryChangeKopecks: Math.max(0, availableCash - reserved) - beforeFree,
    incomeInTransitKopecks: input.incomeInTransitKopecks,
    debtBalances: Object.fromEntries(debtsById),
    goalSavings: Object.fromEntries([...goalsById].map(([id, goal]) => [id, goal.savedAmountKopecks])),
    remainingObligations: Object.fromEntries([...obligationsById].map(([id, obligation]) => [id, obligation.amountKopecks])),
  };
}

export async function simulateUserScenario(userId: string, cycleId: string, actions: SimulationAction[]) {
  const cycle = await getPlanningCycle(userId, cycleId);
  if (cycle.status !== "ACTIVE" && cycle.status !== "DRAFT") throw new Error("Cycle is not active");
  const [snapshot, debtRows, goalRows, obligations, allocations] = await Promise.all([
    getFinancialSnapshot(userId),
    db.select({ id: debts.id, currentBalanceKopecks: debts.currentBalanceKopecks }).from(debts).where(eq(debts.userId, userId)),
    db.select({ id: goals.id, savedAmountKopecks: goals.savedAmountKopecks, targetAmountKopecks: goals.targetAmountKopecks }).from(goals).where(eq(goals.userId, userId)),
    db.select({ id: paymentOccurrences.id, amountKopecks: paymentOccurrences.amountKopecks, protectionLevel: paymentOccurrences.protectionLevel }).from(paymentOccurrences).where(and(eq(paymentOccurrences.userId, userId), gte(paymentOccurrences.dueDate, cycle.startDate), lte(paymentOccurrences.dueDate, cycle.endDate), sql`${paymentOccurrences.status} IN ('PENDING', 'OVERDUE')`)),
    db.select({ amountKopecks: budgetAllocations.amountKopecks, targetType: budgetAllocations.targetType }).from(budgetAllocations).where(and(eq(budgetAllocations.userId, userId), eq(budgetAllocations.cycleId, cycleId))),
  ]);
  const obligationAllocated = allocations.filter((item) => item.targetType === "OBLIGATION").reduce((sum, item) => sum + item.amountKopecks, 0);
  const obligationScheduled = obligations.reduce((sum, item) => sum + item.amountKopecks, 0);
  const excessObligationAllocation = Math.max(0, obligationAllocated - obligationScheduled);
  const otherAllocations = allocations.filter((item) => item.targetType !== "OBLIGATION").reduce((sum, item) => sum + item.amountKopecks, 0);
  return simulateFinancialScenario({ availableCashKopecks: snapshot.availableCashKopecks, protectedAmountKopecks: snapshot.protectedAmountKopecks, lockedAllocationsKopecks: otherAllocations + excessObligationAllocation, incomeInTransitKopecks: snapshot.incomeInTransitKopecks, obligations, debts: debtRows, goals: goalRows }, actions);
}
