import { describe, expect, it } from "vitest";
import { simulateFinancialScenario, type SimulationInput } from "@/lib/domain/simulation/simulationService";

const data = (): SimulationInput => ({ availableCashKopecks: 100000, protectedAmountKopecks: 20000, lockedAllocationsKopecks: 10000, incomeInTransitKopecks: 900000, obligations: [{ id: "hard", amountKopecks: 10000, protectionLevel: "HARD" }, { id: "flex", amountKopecks: 10000, protectionLevel: "NEGOTIABLE" }], debts: [{ id: "debt", currentBalanceKopecks: 50000 }], goals: [{ id: "goal", savedAmountKopecks: 1000, targetAmountKopecks: 20000 }] });

describe("deterministic financial simulation", () => {
  it("keeps expected income separate from spendable money and does not mutate input", () => {
    const input = data();
    const result = simulateFinancialScenario(input, [{ type: "PAY_DEBT", debtId: "debt", amountKopecks: 20000 }]);
    expect(result.before.discretionaryKopecks).toBe(50000);
    expect(result.after).toEqual({ availableCashKopecks: 80000, discretionaryKopecks: 30000 });
    expect(result.incomeInTransitKopecks).toBe(900000);
    expect(result.debtBalances.debt).toBe(30000);
    expect(input.debts[0].currentBalanceKopecks).toBe(50000);
    expect(input.availableCashKopecks).toBe(100000);
  });
  it("rejects spending HARD funds, foreign IDs, overpayment, fractional and negative amounts", () => {
    for (const amount of [50001, -1, 1.1]) expect(() => simulateFinancialScenario(data(), [{ type: "PAY_DEBT", debtId: "debt", amountKopecks: amount }])).toThrow();
    expect(() => simulateFinancialScenario(data(), [{ type: "CLOSE_DEBT", debtId: "debt" }, { type: "FUND_GOAL", goalId: "goal", amountKopecks: 1 }])).toThrow("discretionary");
    expect(() => simulateFinancialScenario(data(), [{ type: "PAY_DEBT", debtId: "foreign", amountKopecks: 1 }])).toThrow("not found");
    expect(() => simulateFinancialScenario(data(), [{ type: "REDUCE_NEGOTIABLE", occurrenceId: "hard", amountKopecks: 1 }])).toThrow("protected");
  });
  it("closes a debt precisely and tracks goal funding as reserved cash without deducting cash twice", () => {
    const funded = simulateFinancialScenario(data(), [{ type: "FUND_GOAL", goalId: "goal", amountKopecks: 10000 }]);
    const closed = simulateFinancialScenario(data(), [{ type: "CLOSE_DEBT", debtId: "debt" }]);
    expect(funded.after.availableCashKopecks).toBe(100000);
    expect(funded.goalSavings.goal).toBe(11000);
    expect(funded.after.discretionaryKopecks).toBe(40000);
    expect(closed.debtBalances.debt).toBe(0);
    expect(closed.after.availableCashKopecks).toBe(50000);
    expect(() => simulateFinancialScenario(data(), [{ type: "FUND_GOAL", goalId: "goal", amountKopecks: 10000 }, { type: "CLOSE_DEBT", debtId: "debt" }])).toThrow("discretionary");
  });
  it("allows only negotiated reductions within the remaining obligation amount", () => {
    const result = simulateFinancialScenario(data(), [{ type: "REDUCE_NEGOTIABLE", occurrenceId: "flex", amountKopecks: 6000 }]);
    expect(result.after.discretionaryKopecks).toBe(56000);
    expect(result.remainingObligations.flex).toBe(4000);
    expect(() => simulateFinancialScenario(data(), [{ type: "REDUCE_NEGOTIABLE", occurrenceId: "flex", amountKopecks: 6000 }, { type: "REDUCE_NEGOTIABLE", occurrenceId: "flex", amountKopecks: 5000 }])).toThrow();
  });
  it("preserves the cash/protection invariant for every valid partial payment", () => {
    for (let amount = 1; amount <= 50000; amount += 31) {
      const result = simulateFinancialScenario(data(), [{ type: "PAY_DEBT", debtId: "debt", amountKopecks: amount }]);
      expect(result.after.discretionaryKopecks).toBe(50000 - amount);
      expect(result.debtBalances.debt).toBe(50000 - amount);
    }
  });
  it("rejects unsafe integer amounts before arithmetic", () => {
    expect(() => simulateFinancialScenario({ ...data(), availableCashKopecks: Number.MAX_SAFE_INTEGER + 1 }, [])).toThrow("safe integer");
    expect(() => simulateFinancialScenario(data(), [{ type: "PAY_DEBT", debtId: "debt", amountKopecks: Number.MAX_SAFE_INTEGER + 1 }])).toThrow("safe integer");
  });
});
