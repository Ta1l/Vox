import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as expenseService from "@/lib/domain/expenses/expenseService";
import * as money from "@/lib/money";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { eq } from "drizzle-orm";

describe("Expense service", () => {
  let testUserId: string;

  beforeAll(async () => {
    const [user] = await db.insert(users).values({
      email: "test-expense@example.com",
      name: "Test User",
      passwordHash: "fake-hash",
    }).returning();
    testUserId = user.id;
  });

  afterAll(async () => {
    await db.delete(expenseEntries).where(eq(expenseEntries.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe("createExpense", () => {
    it("should create expense entry", async () => {
      const expense = await expenseService.createExpense({
        userId: testUserId,
        amountKopecks: money.toKopecks(500),
        category: "Food",
        title: "Groceries",
        expenseDate: new Date(),
      });

      expect(expense.amountKopecks).toBe(50000);
      expect(expense.category).toBe("Food");
      expect(expense.userId).toBe(testUserId);
    });

    it("should reject negative amounts", async () => {
      await expect(
        expenseService.createExpense({
          userId: testUserId,
          amountKopecks: -100,
          category: "Food",
          title: "Test",
          expenseDate: new Date(),
        })
      ).rejects.toThrow("Expense amount must be positive");
    });

    it("should reject zero amounts", async () => {
      await expect(
        expenseService.createExpense({
          userId: testUserId,
          amountKopecks: 0,
          category: "Food",
          title: "Test",
          expenseDate: new Date(),
        })
      ).rejects.toThrow("Expense amount must be positive");
    });
  });

  describe("getTotalExpenses - RULE-E1", () => {
    it("should calculate total expenses", async () => {
      await expenseService.createExpense({
        userId: testUserId,
        amountKopecks: money.toKopecks(100),
        category: "Food",
        title: "Lunch",
        expenseDate: new Date(),
      });

      await expenseService.createExpense({
        userId: testUserId,
        amountKopecks: money.toKopecks(200),
        category: "Transport",
        title: "Bus",
        expenseDate: new Date(),
      });

      const total = await expenseService.getTotalExpenses(testUserId);
      expect(total).toBeGreaterThanOrEqual(money.toKopecks(300));
    });
  });

  describe("getExpensesByUser", () => {
    it("should filter by category", async () => {
      await expenseService.createExpense({
        userId: testUserId,
        amountKopecks: money.toKopecks(50),
        category: "TestCategory",
        title: "Test",
        expenseDate: new Date(),
      });

      const expenses = await expenseService.getExpensesByUser(testUserId, "TestCategory");
      expect(expenses.some(e => e.category === "TestCategory")).toBe(true);
    });
  });
});
