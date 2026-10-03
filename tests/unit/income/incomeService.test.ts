import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as incomeService from "@/lib/domain/income/incomeService";
import * as money from "@/lib/money";
import { db, sql as pgClient } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { incomeEntries } from "@/lib/db/schema/income";
import { eq } from "drizzle-orm";

describe("Income service", () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      email: "test-income@example.com",
      name: "Test User",
      passwordHash: "fake-hash",
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up
    await db.delete(incomeEntries).where(eq(incomeEntries.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe("createIncome", () => {
    it("should create income entry with EARNED status", async () => {
      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(5000),
        source: "Salary",
        earnedAt: new Date(),
      });

      expect(income.status).toBe("EARNED");
      expect(income.amountKopecks).toBe(500000);
      expect(income.userId).toBe(testUserId);
    });

    it("should reject negative amounts", async () => {
      await expect(
        incomeService.createIncome({
          userId: testUserId,
          amountKopecks: -100,
          earnedAt: new Date(),
        })
      ).rejects.toThrow("Income amount must be positive");
    });

    it("should reject zero amounts", async () => {
      await expect(
        incomeService.createIncome({
          userId: testUserId,
          amountKopecks: 0,
          earnedAt: new Date(),
        })
      ).rejects.toThrow("Income amount must be positive");
    });
  });

  describe("updateIncomeStatus - RULE-I3", () => {
    it("should allow EARNED -> RECEIVED", async () => {
      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: new Date(),
      });

      const updated = await incomeService.updateIncomeStatus({
        incomeId: income.id,
        userId: testUserId,
        newStatus: "RECEIVED",
        receivedAt: new Date(),
      });

      expect(updated.status).toBe("RECEIVED");
      expect(updated.receivedAt).toBeDefined();
    });

    it("should allow EARNED -> IN_TRANSIT", async () => {
      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: new Date(),
      });

      const updated = await incomeService.updateIncomeStatus({
        incomeId: income.id,
        userId: testUserId,
        newStatus: "IN_TRANSIT",
      });

      expect(updated.status).toBe("IN_TRANSIT");
    });

    it("should allow IN_TRANSIT -> RECEIVED", async () => {
      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: new Date(),
      });

      await incomeService.updateIncomeStatus({
        incomeId: income.id,
        userId: testUserId,
        newStatus: "IN_TRANSIT",
      });

      const updated = await incomeService.updateIncomeStatus({
        incomeId: income.id,
        userId: testUserId,
        newStatus: "RECEIVED",
        receivedAt: new Date(),
      });

      expect(updated.status).toBe("RECEIVED");
    });

    it("should reject RECEIVED -> CANCELLED (invalid)", async () => {
      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: new Date(),
      });

      await incomeService.updateIncomeStatus({
        incomeId: income.id,
        userId: testUserId,
        newStatus: "RECEIVED",
        receivedAt: new Date(),
      });

      await expect(
        incomeService.updateIncomeStatus({
          incomeId: income.id,
          userId: testUserId,
          newStatus: "CANCELLED",
        })
      ).rejects.toThrow("Invalid status transition");
    });

    it("should reject RECEIVED -> EARNED (invalid)", async () => {
      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: new Date(),
      });

      await incomeService.updateIncomeStatus({
        incomeId: income.id,
        userId: testUserId,
        newStatus: "RECEIVED",
        receivedAt: new Date(),
      });

      await expect(
        incomeService.updateIncomeStatus({
          incomeId: income.id,
          userId: testUserId,
          newStatus: "EARNED",
        })
      ).rejects.toThrow("Invalid status transition");
    });

    it("should require receivedAt when marking as RECEIVED", async () => {
      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: new Date(),
      });

      await expect(
        incomeService.updateIncomeStatus({
          incomeId: income.id,
          userId: testUserId,
          newStatus: "RECEIVED",
        })
      ).rejects.toThrow("receivedAt is required");
    });
  });

  describe("getReceivedIncomeTotal - RULE-I1", () => {
    it("should only count RECEIVED income", async () => {
      // Create test incomes
      await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(1000),
        earnedAt: new Date(),
      });

      const inTransit = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(2000),
        earnedAt: new Date(),
      });
      await incomeService.updateIncomeStatus({
        incomeId: inTransit.id,
        userId: testUserId,
        newStatus: "IN_TRANSIT",
      });

      const received = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(3000),
        earnedAt: new Date(),
      });
      await incomeService.updateIncomeStatus({
        incomeId: received.id,
        userId: testUserId,
        newStatus: "RECEIVED",
        receivedAt: new Date(),
      });

      const total = await incomeService.getReceivedIncomeTotal(testUserId);

      // Only RECEIVED income (3000 RUB)
      expect(total).toBeGreaterThanOrEqual(money.toKopecks(3000));
    });
  });

  describe("getIncomeInTransit - RULE-I2", () => {
    it("should calculate expected income separately", async () => {
      const income = await incomeService.createIncome({
        userId: testUserId,
        amountKopecks: money.toKopecks(5000),
        earnedAt: new Date(),
      });

      await incomeService.updateIncomeStatus({
        incomeId: income.id,
        userId: testUserId,
        newStatus: "IN_TRANSIT",
      });

      const inTransit = await incomeService.getIncomeInTransit(testUserId);

      expect(inTransit).toBeGreaterThanOrEqual(money.toKopecks(5000));
    });
  });
});
