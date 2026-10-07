import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { incomeEntries } from "@/lib/db/schema/income";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { paymentOccurrences, recurringObligations } from "@/lib/db/schema/obligations";
import { debtPayments, debts } from "@/lib/db/schema/debts";
import { goalContributions, goals } from "@/lib/db/schema/goals";
import { budgetEnvelopes } from "@/lib/db/schema/envelopes";
import * as incomeService from "@/lib/domain/income/incomeService";
import * as expenseService from "@/lib/domain/expenses/expenseService";
import * as obligationService from "@/lib/domain/obligations/obligationService";
import * as debtService from "@/lib/domain/debts/debtService";
import * as goalService from "@/lib/domain/goals/goalService";
import { getDashboardSnapshot } from "@/lib/domain/dashboard/dashboardService";

describe("dashboard snapshot", () => {
  let userId: string;

  beforeAll(async () => {
    const [user] = await db.insert(users).values({ email: `dashboard-${Date.now()}@example.com`, name: "Dashboard Test", passwordHash: "fake" }).returning();
    userId = user.id;
    const received = await incomeService.createIncome({ userId, amountKopecks: 100000, earnedAt: new Date("2026-10-01T09:00:00Z") });
    await incomeService.updateIncomeStatus({ incomeId: received.id, userId, newStatus: "RECEIVED", receivedAt: new Date("2026-10-01T10:00:00Z") });
    await incomeService.createIncome({ userId, amountKopecks: 25000, earnedAt: new Date("2026-10-03T18:00:00Z") });
    const transit = await incomeService.createIncome({ userId, amountKopecks: 40000, earnedAt: new Date("2026-10-03T19:00:00Z"), expectedAt: "2026-10-10" });
    await incomeService.updateIncomeStatus({ incomeId: transit.id, userId, newStatus: "IN_TRANSIT" });
    await expenseService.createExpense({ userId, amountKopecks: 7000, category: "Food", title: "Today", expenseDate: new Date("2026-10-03T23:59:00Z") });
    await expenseService.createExpense({ userId, amountKopecks: 9000, category: "Old", title: "September", expenseDate: new Date("2026-09-30T12:00:00Z") });
    const obligation = await obligationService.createObligation({ userId, name: "Rent", amountKopecks: 30000, recurrenceType: "ONE_TIME", protectionLevel: "HARD", startDate: "2026-10-04" });
    await obligationService.generateOccurrences(obligation.id, userId, "2026-10-10");
    await debtService.createDebt({ userId, name: "Card", originalAmountKopecks: 80000, currentBalanceKopecks: 60000, dueDate: "2026-10-15" });
    await goalService.createGoal({ userId, name: "Vacation", targetAmountKopecks: 100000, savedAmountKopecks: 25000, deadline: "2026-12-01" });
  });

  afterAll(async () => {
    await db.delete(goalContributions).where(eq(goalContributions.userId, userId));
    await db.delete(goals).where(eq(goals.userId, userId));
    await db.delete(debtPayments).where(eq(debtPayments.userId, userId));
    await db.delete(debts).where(eq(debts.userId, userId));
    await db.delete(paymentOccurrences).where(eq(paymentOccurrences.userId, userId));
    await db.delete(recurringObligations).where(eq(recurringObligations.userId, userId));
    await db.delete(budgetEnvelopes).where(eq(budgetEnvelopes.userId, userId));
    await db.delete(incomeEntries).where(eq(incomeEntries.userId, userId));
    await db.delete(expenseEntries).where(eq(expenseEntries.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("uses inclusive current-day boundaries and keeps transit separate", async () => {
    const snapshot = await getDashboardSnapshot(userId, "2026-10-03");
    expect(snapshot.earnedIncome.weekly).toBe(165000);
    expect(snapshot.earnedIncome.monthly).toBe(165000);
    expect(snapshot.expenses.weekly).toBe(16000);
    expect(snapshot.expenses.monthly).toBe(7000);
    expect(snapshot.financial.availableCashKopecks).toBe(84000);
    // RULE-FS2: both EARNED (25000) and IN_TRANSIT (40000) remain in transit.
    expect(snapshot.financial.incomeInTransitKopecks).toBe(65000);
    expect(snapshot.nearestPayments[0]).toMatchObject({ name: "Rent", dueDate: "2026-10-04", amountKopecks: 30000, status: "PENDING" });
    expect(snapshot.debts[0]).toMatchObject({ name: "Card", currentBalanceKopecks: 60000 });
    expect(snapshot.goals[0]).toMatchObject({ name: "Vacation", savedAmountKopecks: 25000, targetAmountKopecks: 100000 });
  });
});
