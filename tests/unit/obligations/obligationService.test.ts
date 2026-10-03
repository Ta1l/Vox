import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { paymentOccurrences, recurringObligations } from "@/lib/db/schema/obligations";
import { eq } from "drizzle-orm";
import * as service from "@/lib/domain/obligations/obligationService";

describe("Recurring obligations", () => {
  let userId: string;
  beforeAll(async () => {
    const [user] = await db.insert(users).values({ email: `obligations-${Date.now()}@example.com`, name: "Test", passwordHash: "fake" }).returning();
    userId = user.id;
  });
  afterAll(async () => { await db.delete(paymentOccurrences).where(eq(paymentOccurrences.userId, userId)); await db.delete(recurringObligations).where(eq(recurringObligations.userId, userId)); await db.delete(users).where(eq(users.id, userId)); });

  it("calculates deterministic weekly dates", () => {
    const dates = service.calculateOccurrenceDates({ startDate: "2026-10-01", endDate: null, recurrenceType: "WEEKLY", recurrenceConfig: null }, "2026-10-22");
    expect(dates).toEqual(["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22"]);
  });

  it("supports custom weekly recurrence and month-end anchoring", () => {
    expect(service.calculateOccurrenceDates({ startDate: "2026-10-01", endDate: null, recurrenceType: "CUSTOM", recurrenceConfig: { dayOfWeek: 4, weekInterval: 2 } }, "2026-10-31")).toEqual(["2026-10-01", "2026-10-15", "2026-10-29"]);
    expect(service.calculateOccurrenceDates({ startDate: "2026-01-31", endDate: null, recurrenceType: "MONTHLY", recurrenceConfig: null }, "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("generates occurrences idempotently and inherits HARD", async () => {
    const obligation = await service.createObligation({ userId, name: "Rent", amountKopecks: 50000, recurrenceType: "WEEKLY", protectionLevel: "HARD", startDate: "2026-10-01" });
    const first = await service.generateOccurrences(obligation.id, userId, "2026-10-22");
    const second = await service.generateOccurrences(obligation.id, userId, "2026-10-22");
    expect(first).toHaveLength(4);
    expect(second).toHaveLength(4);
    expect(new Set(second.map((item) => item.dueDate)).size).toBe(4);
    expect(second.every((item) => item.protectionLevel === "HARD")).toBe(true);
  });

  it("handles month-end and immutable paid state", async () => {
    const obligation = await service.createObligation({ userId, name: "Monthly", amountKopecks: 100, recurrenceType: "MONTHLY", recurrenceConfig: { dayOfMonth: 31 }, protectionLevel: "NEGOTIABLE", startDate: "2026-01-31" });
    const dates = service.calculateOccurrenceDates(obligation, "2026-04-30");
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    const [occurrence] = await service.generateOccurrences(obligation.id, userId, "2026-01-31");
    await service.markPaid(userId, occurrence.id);
    await expect(service.markPaid(userId, occurrence.id)).rejects.toThrow("immutable");
  });

  it("marks only pending past occurrences overdue", async () => {
    const obligation = await service.createObligation({ userId, name: "Utility", amountKopecks: 1200, recurrenceType: "ONE_TIME", protectionLevel: "FLEXIBLE", startDate: "2026-01-01" });
    const [occurrence] = await service.generateOccurrences(obligation.id, userId, "2026-01-01");
    const [updated] = await service.markOverdue(userId, "2026-01-02");
    expect(updated.id).toBe(occurrence.id);
    expect(updated.status).toBe("OVERDUE");
    await expect(service.markPaid(userId, occurrence.id)).resolves.toMatchObject({ status: "PAID" });
  });
});
