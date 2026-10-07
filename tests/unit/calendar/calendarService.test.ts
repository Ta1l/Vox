import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as calendarService from "@/lib/domain/calendar/calendarService";
import * as incomeService from "@/lib/domain/income/incomeService";
import * as expenseService from "@/lib/domain/expenses/expenseService";
import * as money from "@/lib/money";
import * as obligationService from "@/lib/domain/obligations/obligationService";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { incomeEntries } from "@/lib/db/schema/income";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { eq } from "drizzle-orm";

describe("Calendar service", () => {
  let testUserId: string;

  beforeAll(async () => {
    const [user] = await db.insert(users).values({
      email: "test-calendar@example.com",
      name: "Test User",
      passwordHash: "fake-hash",
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    await db.delete(incomeEntries).where(eq(incomeEntries.userId, testUserId));
    await db.delete(expenseEntries).where(eq(expenseEntries.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe("getMonthEvents", () => {
    it("should aggregate income and expenses by date", async () => {
      const testDate = new Date("2026-01-15T12:00:00Z");

      await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: testDate,
      });

      await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(500),
        earnedAt: testDate,
      });

      await expenseService.createExpense({
        userId: testUserId,
        amountKopecks: money.toKopecks(300),
        category: "Food",
        title: "Lunch",
        expenseDate: testDate,
      });

      const events = await calendarService.getMonthEvents(testUserId, 2026, 1);

      const event = events.find((e) => e.date === "2026-01-15");
      expect(event).toBeDefined();
      expect(event?.earnedIncome).toBe(money.toKopecks(1500));
      expect(event?.inTransitIncome).toBe(money.toKopecks(1500));
      expect(event?.expenses).toBe(money.toKopecks(300));
      expect(event?.scheduledPayments).toEqual([]);
    });

    it("should separate received and expected income", async () => {
      const testDate = new Date("2026-02-10T12:00:00Z");

      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(2000),
        earnedAt: testDate,
      });

      await incomeService.updateIncomeStatus({
        incomeId: income.id,
        userId: testUserId,
        newStatus: "RECEIVED",
        receivedAt: testDate,
      });

      await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: testDate,
      });

      const events = await calendarService.getMonthEvents(testUserId, 2026, 2);

      const event = events.find((e) => e.date === "2026-02-10");
      expect(event).toBeDefined();
      expect(event?.receivedIncome).toBe(money.toKopecks(2000));
      expect(event?.expectedIncome).toBe(money.toKopecks(1000));
      expect(event?.inTransitIncome).toBe(money.toKopecks(1000));
    });

    it("should place expected and received events on their settlement dates", async () => {
      await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: 30000,
        earnedAt: new Date("2026-01-31T12:00:00Z"),
        expectedAt: "2026-02-03",
      });

      const received = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: 40000,
        earnedAt: new Date("2026-01-31T12:00:00Z"),
      });
      await incomeService.updateIncomeStatus({
        incomeId: received.id,
        userId: testUserId,
        newStatus: "RECEIVED",
        receivedAt: new Date("2026-02-04T12:00:00Z"),
      });

      const events = await calendarService.getMonthEvents(testUserId, 2026, 2);
      expect(events.find((e) => e.date === "2026-02-03")?.expectedIncome).toBe(30000);
      expect(events.find((e) => e.date === "2026-02-03")?.inTransitIncome).toBe(0);
      expect(events.find((e) => e.date === "2026-02-04")?.receivedIncome).toBe(40000);
      expect(events.find((e) => e.date === "2026-01-31")).toBeUndefined();
    });

    it("keeps transit on earned date and excludes cancelled income", async () => {
      const earnedAt = new Date("2026-04-30T12:00:00Z");
      await incomeService.createIncome({ userId: testUserId, amountKopecks: 120000, earnedAt, expectedAt: "2026-05-03" });
      const cancelled = await incomeService.createIncome({ userId: testUserId, amountKopecks: 90000, earnedAt });
      await incomeService.updateIncomeStatus({ incomeId: cancelled.id, userId: testUserId, newStatus: "CANCELLED" });
      const april = await calendarService.getMonthEvents(testUserId, 2026, 4);
      const may = await calendarService.getMonthEvents(testUserId, 2026, 5);
      expect(april.find((item) => item.date === "2026-04-30")).toMatchObject({ earnedIncome: 120000, inTransitIncome: 120000, expectedIncome: 0 });
      expect(may.find((item) => item.date === "2026-05-03")).toMatchObject({ earnedIncome: 0, inTransitIncome: 0, expectedIncome: 120000 });
    });

    it("uses UTC half-open month bounds for expenses", async () => {
      await expenseService.createExpense({ userId: testUserId, amountKopecks: 101, category: "Test", title: "End", expenseDate: new Date("2026-12-31T23:59:59.999Z") });
      await expenseService.createExpense({ userId: testUserId, amountKopecks: 202, category: "Test", title: "Start", expenseDate: new Date("2027-01-01T00:00:00.000Z") });
      expect((await calendarService.getMonthEvents(testUserId, 2026, 12)).find((item) => item.date === "2026-12-31")?.expenses).toBe(101);
      expect((await calendarService.getMonthEvents(testUserId, 2027, 1)).find((item) => item.date === "2027-01-01")?.expenses).toBe(202);
    });

    it("should display scheduled obligation payments", async () => {
      const obligation = await obligationService.createObligation({
        userId: testUserId,
        name: "Rent",
        amountKopecks: 75000,
        recurrenceType: "ONE_TIME",
        protectionLevel: "HARD",
        startDate: "2026-03-15",
      });
      await obligationService.generateOccurrences(obligation.id, testUserId, "2026-03-15");

      const events = await calendarService.getMonthEvents(testUserId, 2026, 3);
      expect(events.find((e) => e.date === "2026-03-15")?.scheduledPayments).toEqual([
        { name: "Rent", amountKopecks: 75000, status: "PENDING", protectionLevel: "HARD" },
      ]);
    });
  });
});
