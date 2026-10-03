import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { debtPayments, debts } from "@/lib/db/schema/debts";
import * as service from "@/lib/domain/debts/debtService";

describe("Debt service", () => {
  let userId: string;
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ email: `debts-${Date.now()}@example.com`, name: "Debt Test", passwordHash: "fake" }).returning();
    userId = user.id;
  });
  afterAll(async () => {
    await db.delete(debtPayments).where(eq(debtPayments.userId, userId));
    await db.delete(debts).where(eq(debts.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("creates a debt with current balance defaulting to original", async () => {
    const debt = await service.createDebt({ userId, name: "Card", originalAmountKopecks: 100000, minimumPaymentKopecks: 10000, dueDate: "2026-01-01" });
    expect(debt.currentBalanceKopecks).toBe(100000);
    expect(debt.status).toBe("ACTIVE");
  });

  it("records auditable partial payments and closes at zero", async () => {
    const debt = await service.createDebt({ userId, name: "Loan", originalAmountKopecks: 100000, currentBalanceKopecks: 70000 });
    const payment = await service.payDebt({ userId, debtId: debt.id, amountKopecks: 30000, idempotencyKey: "loan-1" });
    expect(payment).toMatchObject({ previousBalanceKopecks: 70000, newBalanceKopecks: 40000, amountKopecks: 30000 });
    await service.payDebt({ userId, debtId: debt.id, amountKopecks: 40000, idempotencyKey: "loan-2" });
    await expect(service.getDebt(userId, debt.id)).resolves.toMatchObject({ currentBalanceKopecks: 0, status: "CLOSED" });
    await expect(service.getDebtPayments(userId, debt.id)).resolves.toHaveLength(2);
  });

  it("is idempotent and rejects overpayment", async () => {
    const debt = await service.createDebt({ userId, name: "Small", originalAmountKopecks: 5000 });
    const first = await service.payDebt({ userId, debtId: debt.id, amountKopecks: 1000, idempotencyKey: "same-payment" });
    const second = await service.payDebt({ userId, debtId: debt.id, amountKopecks: 1000, idempotencyKey: "same-payment" });
    expect(second.id).toBe(first.id);
    await expect(service.payDebt({ userId, debtId: debt.id, amountKopecks: 5000 })).rejects.toThrow("exceeds");
  });

  it("calculates catch-up from missed minimum-payment intervals", () => {
    expect(service.calculateCatchUpAmount({ currentBalanceKopecks: 100000, minimumPaymentKopecks: 10000, dueDate: "2026-01-01", schedule: { intervalDays: 30 } }, "2026-03-02")).toBe(30000);
    expect(service.calculateCatchUpAmount({ currentBalanceKopecks: 100000, minimumPaymentKopecks: 10000, dueDate: "2026-03-01", schedule: { intervalDays: 30 } }, "2026-03-02")).toBe(10000);
  });

  it("allows only one concurrent payment against the same version", async () => {
    const debt = await service.createDebt({ userId, name: "Concurrent", originalAmountKopecks: 10000 });
    const results = await Promise.allSettled([
      service.payDebt({ userId, debtId: debt.id, amountKopecks: 7000 }),
      service.payDebt({ userId, debtId: debt.id, amountKopecks: 7000 }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(service.getDebt(userId, debt.id)).resolves.toMatchObject({ currentBalanceKopecks: 3000 });
  });
});
