import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { incomeEntries } from "@/lib/db/schema/income";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { createIncome, getIncomeInTransit, updateIncomeStatus } from "@/lib/domain/income/incomeService";
import { createExpense } from "@/lib/domain/expenses/expenseService";
import { getMonthEvents } from "@/lib/domain/calendar/calendarService";
import { getFinancialSnapshot } from "@/lib/domain/envelopes/envelopeService";

describe("day accounting and RULE-FS2", () => {
  let userId: string;
  let otherUserId: string;
  let earnedId: string;
  beforeAll(async () => {
    const usersCreated = await db.insert(users).values([
      { email: `day-${crypto.randomUUID()}@example.com`, name: "Day", passwordHash: "test" },
      { email: `other-${crypto.randomUUID()}@example.com`, name: "Other", passwordHash: "test" },
    ]).returning();
    userId = usersCreated[0].id;
    otherUserId = usersCreated[1].id;
    const d = new Date("2026-10-06T00:00:00Z");
    earnedId = (await createIncome({ userId, amountKopecks: 500000, earnedAt: d })).id;
    const transit = await createIncome({ userId, amountKopecks: 120000, earnedAt: d, expectedAt: "2026-11-03" });
    await updateIncomeStatus({ userId, incomeId: transit.id, newStatus: "IN_TRANSIT" });
    const delayed = await createIncome({ userId, amountKopecks: 70000, earnedAt: d, expectedAt: "2026-10-06" });
    await updateIncomeStatus({ userId, incomeId: delayed.id, newStatus: "DELAYED" });
    const cancelled = await createIncome({ userId, amountKopecks: 90000, earnedAt: d });
    await updateIncomeStatus({ userId, incomeId: cancelled.id, newStatus: "CANCELLED" });
    const received = await createIncome({ userId, amountKopecks: 180000, earnedAt: new Date("2026-10-05T00:00:00Z") });
    await updateIncomeStatus({ userId, incomeId: received.id, newStatus: "RECEIVED", receivedAt: d });
    await createExpense({ userId, amountKopecks: 125000, category: "Test", title: "Test", expenseDate: d });
    await createIncome({ userId: otherUserId, amountKopecks: 800000, earnedAt: d });
  });
  afterAll(async () => {
    for (const id of [userId, otherUserId]) {
      await db.delete(incomeEntries).where(eq(incomeEntries.userId, id));
      await db.delete(expenseEntries).where(eq(expenseEntries.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
  });
  it("separates work and payment dates, then moves only cash on receipt", async () => {
    const day = (await getMonthEvents(userId, 2026, 10)).find((item) => item.date === "2026-10-06");
    expect(day).toMatchObject({ earnedIncome: 690000, inTransitIncome: 620000, receivedIncome: 180000, expenses: 125000, expectedIncome: 570000 });
    expect((await getMonthEvents(userId, 2026, 11)).find((item) => item.date === "2026-11-03")).toMatchObject({ earnedIncome: 0, inTransitIncome: 0, expectedIncome: 120000 });
    expect(await getIncomeInTransit(userId)).toBe(620000);
    expect(await getFinancialSnapshot(userId)).toMatchObject({ incomeInTransitKopecks: 620000, availableCashKopecks: 55000, protectedAmountKopecks: 0, discretionaryAmountKopecks: 55000 });
    expect(await getIncomeInTransit(otherUserId)).toBe(800000);
    await updateIncomeStatus({ userId, incomeId: earnedId, newStatus: "RECEIVED", receivedAt: new Date("2026-10-07T00:00:00Z") });
    const october = await getMonthEvents(userId, 2026, 10);
    expect(october.find((item) => item.date === "2026-10-06")).toMatchObject({ earnedIncome: 690000, inTransitIncome: 120000, expectedIncome: 70000 });
    expect(october.find((item) => item.date === "2026-10-07")?.receivedIncome).toBe(500000);
    expect(await getIncomeInTransit(userId)).toBe(120000);
    expect(await getFinancialSnapshot(userId)).toMatchObject({ incomeInTransitKopecks: 120000, availableCashKopecks: 555000, discretionaryAmountKopecks: 555000 });
  });
});
