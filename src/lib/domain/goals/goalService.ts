import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import * as money from "@/lib/money";
import { goalContributions, goals } from "@/lib/db/schema/goals";
import type { ProtectionLevel } from "@/lib/db/schema/obligations";

const parseDate = (value: string) => { const d = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new Error("Invalid date"); return d; };
export interface CreateGoalParams { userId: string; name: string; description?: string; targetAmountKopecks: money.Money; savedAmountKopecks?: money.Money; deadline?: string; priority?: number; protectionLevel?: ProtectionLevel; }

export async function createGoal(params: CreateGoalParams) {
  money.validate(params.targetAmountKopecks); if (!money.isPositive(params.targetAmountKopecks)) throw new Error("Goal target must be positive");
  const saved = params.savedAmountKopecks ?? 0; money.validate(saved); if (saved < 0 || saved > params.targetAmountKopecks) throw new Error("Goal saved amount is invalid");
  if (!params.name.trim() || params.name.length > 256) throw new Error("Goal name is required"); if (params.deadline) parseDate(params.deadline);
  const [created] = await db.insert(goals).values({ userId: params.userId, name: params.name.trim(), description: params.description, targetAmountKopecks: params.targetAmountKopecks, savedAmountKopecks: saved, deadline: params.deadline, priority: params.priority ?? 0, protectionLevel: params.protectionLevel ?? "FLEXIBLE", status: saved === params.targetAmountKopecks ? "ACHIEVED" : "ACTIVE" }).returning(); return created;
}
export async function getGoal(userId: string, goalId: string) { const goal = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) }); if (!goal) throw new Error("Goal not found"); return goal; }
export async function getGoals(userId: string) { return db.query.goals.findMany({ where: eq(goals.userId, userId), orderBy: [asc(goals.priority), desc(goals.deadline)] }); }
export async function getContributions(userId: string, goalId: string) { await getGoal(userId, goalId); return db.query.goalContributions.findMany({ where: and(eq(goalContributions.userId, userId), eq(goalContributions.goalId, goalId)), orderBy: desc(goalContributions.contributedAt) }); }

export async function contribute(params: { userId: string; goalId: string; amountKopecks: money.Money; contributedAt?: Date; notes?: string }) {
  money.validate(params.amountKopecks); if (!money.isPositive(params.amountKopecks)) throw new Error("Contribution must be positive");
  return db.transaction(async (tx) => {
    const goal = await tx.query.goals.findFirst({ where: and(eq(goals.id, params.goalId), eq(goals.userId, params.userId)) }); if (!goal) throw new Error("Goal not found");
    if (goal.savedAmountKopecks + params.amountKopecks > goal.targetAmountKopecks) throw new Error("Contribution exceeds goal target");
    const saved = goal.savedAmountKopecks + params.amountKopecks;
    const [updated] = await tx.update(goals).set({ savedAmountKopecks: saved, status: saved === goal.targetAmountKopecks ? "ACHIEVED" : goal.status, version: sql`${goals.version} + 1`, updatedAt: new Date() }).where(and(eq(goals.id, goal.id), eq(goals.version, goal.version))).returning(); if (!updated) throw new Error("Goal changed concurrently; retry contribution");
    const [contribution] = await tx.insert(goalContributions).values({ goalId: goal.id, userId: params.userId, amountKopecks: params.amountKopecks, contributedAt: params.contributedAt ?? new Date(), notes: params.notes }).returning(); return contribution;
  });
}
