import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { aiUsageLog } from "@/lib/db/schema/ai";
import { recordAIUsage } from "@/lib/domain/ai/aiUsageService";
import { createAITools } from "@/lib/domain/ai/aiTools";
import { requestValidatedAI } from "@/lib/domain/ai/aiRequestService";
import { OpenAIProvider } from "@/lib/domain/ai/openaiProvider";
import { vi } from "vitest";
import { z } from "zod";

describe("AI infrastructure", () => {
  let userId: string;
  beforeAll(async () => { const [user] = await db.insert(users).values({ email: `ai-infra-${Date.now()}@example.com`, name: "AI Test", passwordHash: "fake" }).returning(); userId = user.id; });
  afterAll(async () => { await db.delete(aiUsageLog).where(eq(aiUsageLog.userId, userId)); await db.delete(users).where(eq(users.id, userId)); });
  it("logs model usage and never stores prompts or keys", async () => {
    const row = await recordAIUsage(userId, { provider: "openai", model: "test-model", promptTokens: 17, completionTokens: 3, totalTokens: 20, estimatedCostUsd: null });
    expect(row).toMatchObject({ userId, provider: "openai", totalTokens: 20, estimatedCostUsd: null });
    expect((await db.select().from(aiUsageLog).where(eq(aiUsageLog.userId, userId)))).toHaveLength(1);
  });
  it("binds read-only tools to one user and separates transit from available", async () => {
    const tools = createAITools(userId);
    const snapshot = await tools.getFinancialSnapshot("2026-10-04");
    expect(snapshot).toMatchObject({ availableCashKopecks: 0, protectedAmountKopecks: 0, incomeInTransitKopecks: 0 });
    expect(Object.keys(tools).sort()).toEqual(["getFinancialSnapshot", "simulateScenario"]);
    await expect(tools.simulateScenario("00000000-0000-0000-0000-000000000001", [])).rejects.toThrow("not found");
  });
  it("records usage only after schema validation and returns no raw provider response", async () => {
    const network = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "resp_2", output: [{ content: [{ type: "output_text", text: '{"summary":"safe"}' }] }], usage: { input_tokens: 2, output_tokens: 3, total_tokens: 5 } })));
    const response = await requestValidatedAI(new OpenAIProvider("fake", network, "test-model"), { userId, system: "Policy", userMessage: "Question", schemaName: "advice", schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"], additionalProperties: false }, validate: (value) => z.object({ summary: z.string() }).parse(value) });
    expect(response).toEqual({ summary: "safe" });
    expect((await db.select().from(aiUsageLog).where(eq(aiUsageLog.userId, userId))).at(-1)?.totalTokens).toBe(5);
  });
});
