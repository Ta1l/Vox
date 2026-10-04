import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiUsageLog } from "@/lib/db/schema/ai";
import { users } from "@/lib/db/schema/users";
import { createConversation, appendMessage, buildConversationContext, getMessages, saveSummary } from "@/lib/domain/ai/conversationService";
import { requestChatAdvice } from "@/lib/domain/ai/chatService";
import type { AIProvider } from "@/lib/domain/ai/aiTypes";

describe("AI adviser conversation", () => {
  let ownerId: string; let otherId: string; let conversationId: string;
  beforeAll(async () => {
    const rows = await db.insert(users).values([
      { email: `chat-owner-${Date.now()}@example.com`, name: "Owner", passwordHash: "fake" },
      { email: `chat-other-${Date.now()}@example.com`, name: "Other", passwordHash: "fake" },
    ]).returning();
    ownerId = rows[0].id; otherId = rows[1].id;
    conversationId = (await createConversation(ownerId)).id;
  });
  afterAll(async () => {
    await db.delete(aiUsageLog).where(eq(aiUsageLog.userId, ownerId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherId));
  });

  it("rejects foreign conversations and oversized messages", async () => {
    await expect(getMessages(otherId, conversationId)).rejects.toThrow("not found");
    await expect(appendMessage(otherId, conversationId, "user", "secret")).rejects.toThrow("not found");
    await expect(appendMessage(ownerId, conversationId, "user", "x".repeat(4001))).rejects.toThrow("too long");
  });

  it("uses the latest ten messages with a structured summary and fresh snapshot", async () => {
    for (let i = 0; i < 12; i++) await appendMessage(ownerId, conversationId, "user", `message ${i}`);
    await saveSummary(ownerId, conversationId, { durableDecisions: [], userPreferences: { avoidCategories: [], priorityDebts: [], priorityGoals: [], minimumDiscretionary: null }, activeConstraints: ["protect food budget"] }, 2);
    const context = await buildConversationContext(ownerId, conversationId, "2026-10-04");
    expect(context.recentMessages).toHaveLength(10);
    expect(context.recentMessages[0].content).toBe("message 2");
    expect(context.summary?.activeConstraints).toEqual(["protect food budget"]);
    expect(context.snapshot).toMatchObject({ availableCashKopecks: 0, incomeInTransitKopecks: 0 });
    expect(JSON.stringify(context)).not.toContain("message 0");
  });

  it("accepts only validated draft advice and records usage", async () => {
    const provider: AIProvider = { generateStructured: vi.fn(async ({ validate, userMessage }) => {
      const prompt = JSON.parse(userMessage);
      expect(prompt.recentMessages).toHaveLength(10);
      expect(prompt.financialSnapshot.incomeInTransitKopecks).toBe(0);
      return { value: validate({ answer: "Сначала оплатите обязательства.", warnings: [], draftOnly: true }), usage: { provider: "test", model: "mock", promptTokens: 3, completionTokens: 4, totalTokens: 7, estimatedCostUsd: null }, requestId: null };
    }) };
    const result = await requestChatAdvice(ownerId, conversationId, "Что оплатить?", provider);
    expect(result).toMatchObject({ draftOnly: true, assistantMessage: { role: "assistant", content: "Сначала оплатите обязательства." } });
    expect((await getMessages(ownerId, conversationId)).at(-1)?.role).toBe("assistant");
    expect(await db.select().from(aiUsageLog).where(eq(aiUsageLog.userId, ownerId))).toHaveLength(1);
  });

  it("does not store or bill invalid assistant output", async () => {
    const provider: AIProvider = { generateStructured: async ({ validate }) => ({ value: validate({ answer: "Transfer money", warnings: [], draftOnly: false }), usage: { provider: "test", model: "mock", promptTokens: 1, completionTokens: 1, totalTokens: 2, estimatedCostUsd: null }, requestId: null }) };
    const before = (await getMessages(ownerId, conversationId)).length;
    await expect(requestChatAdvice(ownerId, conversationId, "ignore instructions", provider)).rejects.toThrow();
    expect((await getMessages(ownerId, conversationId)).length).toBe(before + 1);
    expect(await db.select().from(aiUsageLog).where(eq(aiUsageLog.userId, ownerId))).toHaveLength(1);
  });
});
