import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiProviderConfigs } from "@/lib/db/schema/aiProviderConfigs";
import { users } from "@/lib/db/schema/users";
import { CustomOpenAICompatibleProvider } from "@/lib/domain/ai/customOpenAIProvider";
import { getAIProvider } from "@/lib/domain/ai/aiRequestService";
import { getProviderConfig, getProviderConfigMetadata, saveProviderConfig, validateBaseUrl } from "@/lib/domain/ai/providerConfigService";

describe("user AI provider configuration", () => {
  let userId: string; let otherUserId: string;
  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = "11".repeat(32);
    const rows = await db.insert(users).values([{ email: `provider-${Date.now()}@example.com`, name: "Provider", passwordHash: "test" }, { email: `provider-other-${Date.now()}@example.com`, name: "Other", passwordHash: "test" }]).returning();
    userId = rows[0].id; otherUserId = rows[1].id;
  });
  afterAll(async () => { await db.delete(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId)); await db.delete(users).where(eq(users.id, userId)); await db.delete(users).where(eq(users.id, otherUserId)); });

  it("encrypts the API key and exposes metadata without decrypting it", async () => {
    await saveProviderConfig(userId, { baseUrl: "https://provider.example", apiKey: "secret-provider-key", modelName: "custom-model" });
    const row = (await db.select().from(aiProviderConfigs).where(eq(aiProviderConfigs.userId, userId)))[0];
    expect(row.apiKeyEncrypted).not.toContain("secret-provider-key");
    expect(await getProviderConfigMetadata(userId)).toMatchObject({ baseUrl: "https://provider.example", modelName: "custom-model", hasApiKey: true });
    expect((await getProviderConfig(userId))?.apiKey).toBe("secret-provider-key");
    expect(await getProviderConfig(otherUserId)).toBeNull();
    expect(await getAIProvider(userId)).toBeInstanceOf(CustomOpenAICompatibleProvider);
  });

  it("rejects unsafe production endpoints and non-compatible model names", () => {
    const env = process.env as Record<string, string | undefined>; const previous = env.NODE_ENV; env.NODE_ENV = "production";
    expect(() => validateBaseUrl("http://provider.example")).toThrow();
    expect(() => validateBaseUrl("https://127.0.0.1")).toThrow();
    expect(() => validateBaseUrl("https://provider.example?token=secret")).toThrow();
    env.NODE_ENV = previous;
  });

  it("sends OpenAI-compatible structured output and validates it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "custom-1", output: [{ content: [{ type: "output_text", text: '{"status":"ok"}' }] }], usage: { input_tokens: 2, output_tokens: 3, total_tokens: 5 } }), { status: 200 }));
    const provider = new CustomOpenAICompatibleProvider({ baseUrl: "https://provider.example", modelName: "custom-model", apiKey: "secret-provider-key" }, fetchMock);
    const result = await provider.generateStructured({ userId, system: "policy", userMessage: "hello", schemaName: "test", schema: { type: "object" }, validate: (value) => { if ((value as { status?: string }).status !== "ok") throw new Error("invalid"); return value as { status: string }; } });
    expect(result).toMatchObject({ value: { status: "ok" }, usage: { provider: "custom", model: "custom-model", totalTokens: 5 } });
    expect(fetchMock.mock.calls[0][0]).toBe("https://provider.example/v1/responses");
    expect(JSON.stringify(fetchMock.mock.calls[0][1])).toContain("Bearer secret-provider-key");
  });
});
