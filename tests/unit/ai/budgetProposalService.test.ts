import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { createPlanningCycle } from "@/lib/domain/planning/planningService";
import { planningCycles } from "@/lib/db/schema/planning";
import { getFinancialSnapshotForAI } from "@/lib/domain/ai/aiTypes";
import { validateBudgetProposal } from "@/lib/domain/ai/budgetProposalService";

describe("budget proposal validation", () => { let userId: string; let cycleId: string; let snapshotVersion: string;
  beforeAll(async () => { userId = (await db.insert(users).values({ email: `proposal-${Date.now()}@example.com`, name: "Proposal", passwordHash: "fake" }).returning())[0].id; const cycle = await createPlanningCycle({ userId, startDate: "2026-10-04", endDate: "2026-10-11" }); cycleId = cycle.id; snapshotVersion = (await getFinancialSnapshotForAI(userId, "2026-10-04")).snapshotVersion; });
  afterAll(async () => { await db.delete(planningCycles).where(eq(planningCycles.userId, userId)); await db.delete(users).where(eq(users.id, userId)); });
  it("recalculates totals and never trusts model totals", async () => { const result = await validateBudgetProposal(userId, cycleId, { snapshotVersion, summary: "Keep cash safe", allocations: [], alternatives: [], warnings: [] }); expect(result.totalAllocatedKopecks).toBe(0); expect(result.remainingDiscretionaryKopecks).toBe(0); expect(result.protectionsRespected.expectedIncomeNotSpent).toBe(true); });
  it("rejects stale and oversized proposals", async () => { await expect(validateBudgetProposal(userId, cycleId, { snapshotVersion: "0".repeat(64), summary: "x", allocations: [], alternatives: [], warnings: [] })).rejects.toThrow("stale"); await expect(validateBudgetProposal(userId, cycleId, { snapshotVersion, summary: "x", allocations: [{ targetType: "GENERAL", targetId: null, targetName: "x", amountKopecks: 1, reason: "x", priority: 0 }], alternatives: [], warnings: [] })).rejects.toThrow("exceeds"); });
  it("rejects a model-provided foreign or missing entity id", async () => { await expect(validateBudgetProposal(userId, cycleId, { snapshotVersion, summary: "x", allocations: [{ targetType: "DEBT", targetId: "00000000-0000-4000-8000-000000000001", targetName: "foreign debt", amountKopecks: 1, reason: "x", priority: 0 }], alternatives: [], warnings: [] })).rejects.toThrow("target not found"); });
});
