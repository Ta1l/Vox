import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { goalContributions, goals } from "@/lib/db/schema/goals";
import * as service from "@/lib/domain/goals/goalService";

describe("Goal service", () => {
  let userId: string;
  beforeAll(async () => { const [user] = await db.insert(users).values({ email: `goals-${Date.now()}@example.com`, name: "Goal Test", passwordHash: "fake" }).returning(); userId = user.id; });
  afterAll(async () => { await db.delete(goalContributions).where(eq(goalContributions.userId, userId)); await db.delete(goals).where(eq(goals.userId, userId)); await db.delete(users).where(eq(users.id, userId)); });
  it("tracks contributions and achievement", async () => { const goal = await service.createGoal({ userId, name: "Reserve", description: "Emergency", targetAmountKopecks: 10000 }); const first = await service.contribute({ userId, goalId: goal.id, amountKopecks: 4000 }); expect(first.amountKopecks).toBe(4000); await service.contribute({ userId, goalId: goal.id, amountKopecks: 6000 }); await expect(service.getGoal(userId, goal.id)).resolves.toMatchObject({ savedAmountKopecks: 10000, status: "ACHIEVED" }); await expect(service.getContributions(userId, goal.id)).resolves.toHaveLength(2); });
  it("rejects contributions over target and foreign goals", async () => { const goal = await service.createGoal({ userId, name: "Trip", targetAmountKopecks: 1000 }); await expect(service.contribute({ userId, goalId: goal.id, amountKopecks: 1001 })).rejects.toThrow("exceeds"); await expect(service.getGoal("00000000-0000-0000-0000-000000000001", goal.id)).rejects.toThrow("not found"); });
  it("rejects invalid goal target", async () => { await expect(service.createGoal({ userId, name: "Bad", targetAmountKopecks: 0 })).rejects.toThrow("positive"); });
});
