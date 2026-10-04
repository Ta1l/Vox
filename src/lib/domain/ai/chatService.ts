import { z } from "zod";
import { getAIProvider, requestValidatedAI } from "./aiRequestService";
import { CONVERSATION_SUMMARY_POLICY } from "./aiPolicy";
import { appendMessage, buildConversationContext, conversationSummarySchema, getConversationSummary, getMessageStats, getMessageWindow, RECENT_AI_MESSAGES, saveSummary, type ConversationContext } from "./conversationService";
import type { AIProvider } from "./aiTypes";

const adviceSchema = z.object({ answer: z.string().min(1).max(8000), warnings: z.array(z.string()).max(8), draftOnly: z.literal(true) }).strict();
const adviceJsonSchema: Record<string, unknown> = { type: "object", properties: { answer: { type: "string" }, warnings: { type: "array", items: { type: "string" } }, draftOnly: { type: "boolean", enum: [true] } }, required: ["answer", "warnings", "draftOnly"], additionalProperties: false };
const summaryJsonSchema: Record<string, unknown> = { type: "object", properties: { durableDecisions: { type: "array", items: { type: "object", properties: { decision: { type: "string" }, context: { type: "string" }, validUntil: { type: ["string", "null"] } }, required: ["decision", "context", "validUntil"], additionalProperties: false } }, userPreferences: { type: "object", properties: { avoidCategories: { type: "array", items: { type: "string" } }, priorityDebts: { type: "array", items: { type: "string" } }, priorityGoals: { type: "array", items: { type: "string" } }, minimumDiscretionary: { type: ["integer", "null"] } }, required: ["avoidCategories", "priorityDebts", "priorityGoals", "minimumDiscretionary"], additionalProperties: false }, activeConstraints: { type: "array", items: { type: "string" } } }, required: ["durableDecisions", "userPreferences", "activeConstraints"], additionalProperties: false };
const COMPRESS_AFTER_MESSAGES = 20;
const COMPRESS_AFTER_ESTIMATED_TOKENS = 15_000;
const COMPRESS_BATCH_MESSAGES = 10;
const COMPRESS_BATCH_CHARS = 20_000;

function promptFor(context: ConversationContext, message: string) {
  return JSON.stringify({ financialSnapshot: context.snapshot, summary: context.summary, recentMessages: context.recentMessages.map(({ role, content }) => ({ role, content: content.slice(0, 800) })), userMessage: message });
}

async function compressConversationIfNeeded(userId: string, conversationId: string, provider: AIProvider) {
  const stats = await getMessageStats(userId, conversationId);
  const estimatedTokens = Math.ceil(stats.characters / 4);
  if (stats.count < COMPRESS_AFTER_MESSAGES && estimatedTokens < COMPRESS_AFTER_ESTIMATED_TOKENS) return { compressed: false, messagesCoveredCount: 0 };
  const start = (await getConversationSummary(userId, conversationId)).messagesCoveredCount;
  const obsoleteEnd = Math.max(0, stats.count - RECENT_AI_MESSAGES);
  if (obsoleteEnd <= start) return { compressed: false, messagesCoveredCount: start };
  const batch = await getMessageWindow(userId, conversationId, start, Math.min(COMPRESS_BATCH_MESSAGES, obsoleteEnd - start));
  const selected = [] as typeof batch;
  let chars = 0;
  for (const item of batch) {
    if (selected.length && chars + item.content.length > COMPRESS_BATCH_CHARS) break;
    selected.push(item); chars += item.content.length;
  }
  const current = await getConversationSummary(userId, conversationId);
  const summary = await requestValidatedAI(provider, {
    userId,
    system: CONVERSATION_SUMMARY_POLICY,
    userMessage: JSON.stringify({ previousSummary: current.summary, olderMessages: selected.map(({ role, content }) => ({ role, content })) }),
    schemaName: "conversation_summary",
    schema: summaryJsonSchema,
    validate: (value) => conversationSummarySchema.parse(value),
  });
  const messagesCoveredCount = start + selected.length;
  await saveSummary(userId, conversationId, summary, messagesCoveredCount);
  return { compressed: true, messagesCoveredCount };
}

export async function requestChatAdvice(userId: string, conversationId: string, message: string, provider?: AIProvider) {
  const selectedProvider = provider ?? await getAIProvider(userId);
  const userMessage = await appendMessage(userId, conversationId, "user", message);
  const context = await buildConversationContext(userId, conversationId);
  const prompt = promptFor(context, message);
  const estimatedPromptTokens = Math.ceil((context.systemPolicy.length + prompt.length) / 4);
  const result: z.infer<typeof adviceSchema> = await requestValidatedAI(selectedProvider, { userId, system: context.systemPolicy, userMessage: prompt, schemaName: "financial_advice", schema: adviceJsonSchema, validate: (value) => adviceSchema.parse(value) });
  const assistantMessage = await appendMessage(userId, conversationId, "assistant", result.answer);
  let compression = { compressed: false, messagesCoveredCount: 0 };
  try { compression = await compressConversationIfNeeded(userId, conversationId, selectedProvider); } catch { /* Keep a successful advice reply; the next turn can retry compression. */ }
  return { conversationId, userMessage, assistantMessage, estimatedPromptTokens, compression, ...result };
}

export { adviceSchema };
