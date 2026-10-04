import { z } from "zod";
import { OpenAIProvider } from "./openaiProvider";
import { requestValidatedAI } from "./aiRequestService";
import { appendMessage, buildConversationContext, type ConversationContext } from "./conversationService";
import type { AIProvider } from "./aiTypes";

const adviceSchema = z.object({ answer: z.string().min(1).max(8000), warnings: z.array(z.string()).max(8), draftOnly: z.literal(true) }).strict();
const adviceJsonSchema: Record<string, unknown> = { type: "object", properties: { answer: { type: "string" }, warnings: { type: "array", items: { type: "string" } }, draftOnly: { type: "boolean", enum: [true] } }, required: ["answer", "warnings", "draftOnly"], additionalProperties: false };

function promptFor(context: ConversationContext, message: string) {
  return JSON.stringify({ financialSnapshot: context.snapshot, summary: context.summary, recentMessages: context.recentMessages.map(({ role, content }) => ({ role, content: content.slice(0, 800) })), userMessage: message });
}

export async function requestChatAdvice(userId: string, conversationId: string, message: string, provider: AIProvider = new OpenAIProvider()) {
  if (!process.env.OPENAI_API_KEY && provider instanceof OpenAIProvider) throw new Error("OPENAI_API_KEY is not configured");
  const userMessage = await appendMessage(userId, conversationId, "user", message);
  const context = await buildConversationContext(userId, conversationId);
  const result: z.infer<typeof adviceSchema> = await requestValidatedAI(provider, { userId, system: context.systemPolicy, userMessage: promptFor(context, message), schemaName: "financial_advice", schema: adviceJsonSchema, validate: (value) => adviceSchema.parse(value) });
  const assistantMessage = await appendMessage(userId, conversationId, "assistant", result.answer);
  return { conversationId, userMessage, assistantMessage, ...result };
}

export { adviceSchema };
