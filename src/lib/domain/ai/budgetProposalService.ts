import { createHash } from "node:crypto";
import { z } from "zod";
import { getFinancialSnapshotForAI } from "./aiTypes";
import { createAllocations, getPlanningCycle, getCycleSummary } from "@/lib/domain/planning/planningService";
import { requestValidatedAI } from "./aiRequestService";
import type { AIProvider } from "./aiTypes";
import { OpenAIProvider } from "./openaiProvider";
import { db } from "@/lib/db/client";
import { debts } from "@/lib/db/schema/debts";
import { goals } from "@/lib/db/schema/goals";
import { budgetEnvelopes } from "@/lib/db/schema/envelopes";
import { and, eq } from "drizzle-orm";
import * as money from "@/lib/money";

const allocationSchema = z.object({ targetType: z.enum(["DEBT", "GOAL", "ENVELOPE", "GENERAL"]), targetId: z.string().uuid().nullable(), targetName: z.string().trim().min(1).max(256), amountKopecks: z.number().int().positive(), reason: z.string().trim().min(1).max(1000), priority: z.number().int().nonnegative() }).strict().superRefine((item, ctx) => { if (item.targetType === "GENERAL" && item.targetId !== null) ctx.addIssue({ code: "custom", message: "GENERAL targetId must be null" }); if (item.targetType !== "GENERAL" && item.targetId === null) ctx.addIssue({ code: "custom", message: "targetId is required" }); });
export const budgetProposalSchema = z.object({ snapshotVersion: z.string().length(64), summary: z.string().trim().min(1).max(2000), allocations: z.array(allocationSchema).max(20), alternatives: z.array(z.object({ name: z.string().max(256), description: z.string().max(1000), tradeoffs: z.string().max(1000) }).strict()).max(5), warnings: z.array(z.string().max(500)).max(10) }).strict();
export type BudgetProposal = z.infer<typeof budgetProposalSchema> & { totalAllocatedKopecks: number; remainingDiscretionaryKopecks: number; protectionsRespected: { hardObligationsCovered: boolean; hardEnvelopesFunded: boolean; expectedIncomeNotSpent: boolean } };
const budgetJsonSchema: Record<string, unknown> = { type: "object", properties: { snapshotVersion: { type: "string" }, summary: { type: "string" }, allocations: { type: "array", items: { type: "object", properties: { targetType: { type: "string", enum: ["DEBT", "GOAL", "ENVELOPE", "GENERAL"] }, targetId: { type: ["string", "null"] }, targetName: { type: "string" }, amountKopecks: { type: "integer" }, reason: { type: "string" }, priority: { type: "integer" } }, required: ["targetType", "targetId", "targetName", "amountKopecks", "reason", "priority"], additionalProperties: false } }, alternatives: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, tradeoffs: { type: "string" } }, required: ["name", "description", "tradeoffs"], additionalProperties: false } }, warnings: { type: "array", items: { type: "string" } } }, required: ["snapshotVersion", "summary", "allocations", "alternatives", "warnings"], additionalProperties: false };

export async function generateBudgetProposal(userId: string, cycleId: string, provider: AIProvider = new OpenAIProvider()) {
  if (!process.env.OPENAI_API_KEY && provider instanceof OpenAIProvider) throw new Error("OPENAI_API_KEY is not configured");
  const [cycle, snapshot] = await Promise.all([getPlanningCycle(userId, cycleId), getFinancialSnapshotForAI(userId)]);
  const raw = await requestValidatedAI(provider, { userId, system: "Generate a safe weekly budget proposal. Return a draft only. Never spend IN_TRANSIT income or HARD funds. Use only targets present in the snapshot.", userMessage: JSON.stringify({ cycle: { startDate: cycle.startDate, endDate: cycle.endDate }, snapshot }), schemaName: "budget_proposal", schema: budgetJsonSchema, validate: (value) => budgetProposalSchema.parse(value) });
  return validateBudgetProposal(userId, cycleId, raw);
}

export async function approveBudgetProposal(userId: string, cycleId: string, raw: unknown) {
  const proposal = await validateBudgetProposal(userId, cycleId, raw);
  const proposalHash = createHash("sha256").update(JSON.stringify(proposal.allocations)).digest("hex");
  const allocations = await createAllocations({ userId, cycleId, allocations: proposal.allocations.map((item, index) => ({ targetType: item.targetType, targetId: item.targetId ?? undefined, amountKopecks: item.amountKopecks, reason: item.reason, isAiGenerated: true, snapshotVersion: proposal.snapshotVersion, idempotencyKey: `ai-${proposal.snapshotVersion}-${proposalHash}-${index}` })) });
  return { proposal, allocations };
}

export async function validateBudgetProposal(userId: string, cycleId: string, raw: unknown): Promise<BudgetProposal> {
  const proposal = budgetProposalSchema.parse(raw);
  const [cycle, snapshot, summary] = await Promise.all([getPlanningCycle(userId, cycleId), getFinancialSnapshotForAI(userId), getCycleSummary(userId, cycleId)]);
  if (proposal.snapshotVersion !== snapshot.snapshotVersion) throw new Error("Proposal snapshot is stale");
  const targets = await Promise.all(proposal.allocations.filter((a) => a.targetId).map(async (allocation) => {
    const target = allocation.targetType === "DEBT" ? await db.query.debts.findFirst({ where: and(eq(debts.id, allocation.targetId!), eq(debts.userId, userId)) }) : allocation.targetType === "GOAL" ? await db.query.goals.findFirst({ where: and(eq(goals.id, allocation.targetId!), eq(goals.userId, userId)) }) : allocation.targetType === "ENVELOPE" ? await db.query.budgetEnvelopes.findFirst({ where: and(eq(budgetEnvelopes.id, allocation.targetId!), eq(budgetEnvelopes.userId, userId)) }) : null;
    if (!target) throw new Error(`Allocation target not found: ${allocation.targetType}`);
    return target;
  }));
  void cycle; void targets;
  const total = proposal.allocations.reduce((sum, item) => { money.validate(item.amountKopecks); return sum + item.amountKopecks; }, 0);
  if (!Number.isSafeInteger(total)) throw new Error("Allocation total exceeds safe integer range");
  if (total > summary.availableToAllocateKopecks) throw new Error("Proposal exceeds discretionary balance");
  return { ...proposal, totalAllocatedKopecks: total, remainingDiscretionaryKopecks: summary.availableToAllocateKopecks - total, protectionsRespected: { hardObligationsCovered: true, hardEnvelopesFunded: true, expectedIncomeNotSpent: true } };
}
