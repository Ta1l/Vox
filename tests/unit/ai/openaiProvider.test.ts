import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAIProvider } from "@/lib/domain/ai/openaiProvider";

const schema = z.object({ summary: z.string() }).strict();
const params = { userId: "00000000-0000-0000-0000-000000000001", system: "Read-only policy", userMessage: "Question", schemaName: "advice", schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"], additionalProperties: false }, validate: (value: unknown) => schema.parse(value) };
const mockResponse = (content: string, usage = { input_tokens: 17, output_tokens: 3, total_tokens: 20 }) => new Response(JSON.stringify({ id: "resp_1", output: [{ type: "message", content: [{ type: "output_text", text: content }] }], usage }), { status: 200 });

describe("OpenAI provider", () => {
  it("uses strict structured Responses API and reports tokens without exposing secret", async () => {
    const mocked = vi.fn().mockResolvedValue(mockResponse('{"summary":"ok"}'));
    const provider = new OpenAIProvider("secret-test-key", mocked, "test-model");
    const result = await provider.generateStructured(params);
    expect(result.value).toEqual({ summary: "ok" });
    expect(result.usage).toMatchObject({ promptTokens: 17, completionTokens: 3, totalTokens: 20 });
    const [url, request] = mocked.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(request.headers).toMatchObject({ Authorization: "Bearer secret-test-key" });
    const body = JSON.parse(request.body as string);
    expect(body).toMatchObject({ store: false, model: "test-model", user: params.userId, text: { format: { type: "json_schema", strict: true } } });
    expect(JSON.stringify(result)).not.toContain("secret-test-key");
  });
  it("rejects malformed output, invalid schema and unsafe token usage", async () => {
    for (const response of [mockResponse("not json"), mockResponse('{"summary":123}'), mockResponse('{"summary":"ok"}', { input_tokens: -1, output_tokens: 3, total_tokens: 2 })]) {
      const provider = new OpenAIProvider("fake", vi.fn().mockResolvedValue(response), "test-model");
      await expect(provider.generateStructured(params)).rejects.toThrow();
    }
  });
  it("rejects missing usage rather than recording a false zero-token request", async () => {
    const response = new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: '{"summary":"ok"}' }] }] }));
    await expect(new OpenAIProvider("fake", vi.fn().mockResolvedValue(response)).generateStructured(params)).rejects.toThrow("usage");
  });
  it("does not call network without API key and does not leak provider response body", async () => {
    const mocked = vi.fn();
    await expect(new OpenAIProvider("", mocked).generateStructured(params)).rejects.toThrow("not configured");
    expect(mocked).not.toHaveBeenCalled();
    const failed = new OpenAIProvider("secret", vi.fn().mockResolvedValue(new Response("private prompt", { status: 429 })));
    await expect(failed.generateStructured(params)).rejects.toThrow("(429)");
  });
});
