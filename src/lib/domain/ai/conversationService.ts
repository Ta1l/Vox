import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { aiConversations, aiMessages, aiSummaries } from "@/lib/db/schema/ai";
import { getFinancialSnapshotForAI, type FinancialSnapshot } from "./aiTypes";
import { FINANCIAL_ADVISER_POLICY } from "./aiPolicy";

export const MAX_AI_MESSAGE_LENGTH = 4000;
export const RECENT_AI_MESSAGES = 10;

export function sanitizeForAI(value: string, maxLength = 1200) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/```/g, "").replace(/\[INST\]/gi, "").replace(/\b(system|assistant|developer)\s*:/gi, "$1 (quoted):").slice(0, maxLength);
}

export function sanitizeAIValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeForAI(value);
  if (Array.isArray(value)) return value.map(sanitizeAIValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeAIValue(item)]));
  return value;
}

export const conversationSummarySchema = z.object({
  durableDecisions: z.array(z.object({ decision: z.string().max(500), context: z.string().max(1000), validUntil: z.string().nullable() }).strict()).max(20),
  userPreferences: z.object({ avoidCategories: z.array(z.string().max(100)).max(20), priorityDebts: z.array(z.string().max(100)).max(20), priorityGoals: z.array(z.string().max(100)).max(20), minimumDiscretionary: z.number().int().nonnegative().nullable() }).strict(),
  activeConstraints: z.array(z.string().max(500)).max(20),
}).strict();
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;

export interface AIMessage { id: string; role: "user" | "assistant"; content: string; createdAt: Date; }
export interface ConversationContext {
  systemPolicy: string;
  snapshot: FinancialSnapshot;
  summary: ConversationSummary | null;
  recentMessages: AIMessage[];
}

function validateMessage(content: string) {
  if (!content.trim()) throw new Error("Message is required");
  if (content.length > MAX_AI_MESSAGE_LENGTH) throw new Error("Message is too long");
}

export async function createConversation(userId: string) {
  const [conversation] = await db.insert(aiConversations).values({ userId }).returning();
  return conversation;
}

export async function listConversations(userId: string) {
  return db.select().from(aiConversations).where(eq(aiConversations.userId, userId)).orderBy(desc(aiConversations.createdAt));
}

async function requireConversation(userId: string, conversationId: string) {
  const [conversation] = await db.select().from(aiConversations).where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId))).limit(1);
  if (!conversation) throw new Error("Conversation not found");
  return conversation;
}

export async function appendMessage(userId: string, conversationId: string, role: "user" | "assistant", content: string) {
  validateMessage(content);
  await requireConversation(userId, conversationId);
  const [message] = await db.insert(aiMessages).values({ userId, conversationId, role, content }).returning();
  return message;
}

export async function getMessages(userId: string, conversationId: string) {
  await requireConversation(userId, conversationId);
  const rows = await db.select({ id: aiMessages.id, role: aiMessages.role, content: aiMessages.content, createdAt: aiMessages.createdAt }).from(aiMessages).where(and(eq(aiMessages.userId, userId), eq(aiMessages.conversationId, conversationId))).orderBy(aiMessages.createdAt, aiMessages.id);
  return rows;
}

export async function getMessageStats(userId: string, conversationId: string) {
  await requireConversation(userId, conversationId);
  const [stats] = await db.select({ count: sql<number>`count(*)::int`, characters: sql<number>`coalesce(sum(char_length(${aiMessages.content})), 0)::int` }).from(aiMessages).where(and(eq(aiMessages.userId, userId), eq(aiMessages.conversationId, conversationId)));
  return { count: Number(stats?.count ?? 0), characters: Number(stats?.characters ?? 0) };
}

export async function getMessageWindow(userId: string, conversationId: string, offset: number, limit: number) {
  await requireConversation(userId, conversationId);
  return db.select({ id: aiMessages.id, role: aiMessages.role, content: aiMessages.content, createdAt: aiMessages.createdAt }).from(aiMessages).where(and(eq(aiMessages.userId, userId), eq(aiMessages.conversationId, conversationId))).orderBy(aiMessages.createdAt, aiMessages.id).limit(limit).offset(offset);
}

export async function saveSummary(userId: string, conversationId: string, summary: ConversationSummary, messagesCoveredCount: number) {
  await requireConversation(userId, conversationId);
  const parsed = conversationSummarySchema.parse(summary);
  if (!Number.isSafeInteger(messagesCoveredCount) || messagesCoveredCount < 0) throw new Error("Invalid summary coverage");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from ai_conversations where id = ${conversationId} and user_id = ${userId} for update`);
    const [existing] = await tx.select().from(aiSummaries).where(and(eq(aiSummaries.conversationId, conversationId), eq(aiSummaries.userId, userId))).limit(1);
    if (existing && existing.messagesCoveredCount >= messagesCoveredCount) return existing;
    const [saved] = await tx.insert(aiSummaries).values({ conversationId, userId, summary: parsed, messagesCoveredCount }).onConflictDoUpdate({ target: aiSummaries.conversationId, set: { summary: parsed, messagesCoveredCount, updatedAt: new Date() } }).returning();
    return saved;
  });
}

export async function getConversationSummary(userId: string, conversationId: string) {
  await requireConversation(userId, conversationId);
  const [row] = await db.select().from(aiSummaries).where(and(eq(aiSummaries.conversationId, conversationId), eq(aiSummaries.userId, userId))).limit(1);
  const parsed = row ? conversationSummarySchema.safeParse(row.summary).data ?? null : null;
  return { summary: parsed, messagesCoveredCount: row?.messagesCoveredCount ?? 0 };
}

export async function buildConversationContext(userId: string, conversationId: string, asOfDate?: string): Promise<ConversationContext> {
  await requireConversation(userId, conversationId);
  const [snapshot, summaryRow, recentRows] = await Promise.all([
    getFinancialSnapshotForAI(userId, asOfDate),
    db.select().from(aiSummaries).where(and(eq(aiSummaries.conversationId, conversationId), eq(aiSummaries.userId, userId))).limit(1),
    db.select({ id: aiMessages.id, role: aiMessages.role, content: aiMessages.content, createdAt: aiMessages.createdAt }).from(aiMessages).where(and(eq(aiMessages.userId, userId), eq(aiMessages.conversationId, conversationId))).orderBy(desc(aiMessages.createdAt), desc(aiMessages.id)).limit(RECENT_AI_MESSAGES),
  ]);
  const parsedSummary = summaryRow[0] ? conversationSummarySchema.safeParse(summaryRow[0].summary).data ?? null : null;
  return { systemPolicy: FINANCIAL_ADVISER_POLICY, snapshot, summary: parsedSummary, recentMessages: recentRows.reverse() };
}

export { requireConversation };
