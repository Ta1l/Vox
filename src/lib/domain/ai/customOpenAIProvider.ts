import type { AIProvider, AIProviderConfig, AIUsage, StructuredAIResult } from "./aiTypes";
import { assertSafeProviderUrl } from "./providerConfigService";

type FetchLike = typeof fetch;

export class CustomOpenAICompatibleProvider implements AIProvider {
  constructor(private readonly config: AIProviderConfig, private readonly fetchImpl: FetchLike = fetch) {}

  async generateStructured<T>(params: { userId: string; system: string; userMessage: string; schemaName: string; schema: Record<string, unknown>; validate: (value: unknown) => T }): Promise<StructuredAIResult<T>> {
    const baseUrl = await assertSafeProviderUrl(this.config.baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await this.fetchImpl(`${baseUrl.replace(/\/$/, "")}/v1/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.config.modelName, store: false, user: params.userId, input: [{ role: "system", content: params.system }, { role: "user", content: params.userMessage }], text: { format: { type: "json_schema", name: params.schemaName, schema: params.schema, strict: true } } }),
        signal: controller.signal,
      });
    } catch (error) { throw error instanceof DOMException && error.name === "AbortError" ? new Error("Custom AI provider request timed out") : error; }
    finally { clearTimeout(timeout); }
    if (!response.ok) throw new Error(`Custom AI provider request failed (${response.status})`);
    const body = await response.json() as { id?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
    const text = body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("Custom AI provider response did not contain structured output");
    let value: T;
    try { value = params.validate(JSON.parse(text)); } catch { throw new Error("Custom AI provider returned malformed or schema-invalid structured output"); }
    const promptTokens = body.usage?.input_tokens ?? 0;
    const completionTokens = body.usage?.output_tokens ?? 0;
    const totalTokens = body.usage?.total_tokens ?? promptTokens + completionTokens;
    if (![promptTokens, completionTokens, totalTokens].every((tokens) => Number.isSafeInteger(tokens) && tokens >= 0)) throw new Error("Custom AI provider returned invalid usage");
    const usage: AIUsage = { provider: "custom", model: this.config.modelName, promptTokens, completionTokens, totalTokens, estimatedCostUsd: null };
    return { value, usage, requestId: body.id ?? null };
  }
}
