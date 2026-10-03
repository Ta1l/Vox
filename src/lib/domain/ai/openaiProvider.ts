import type { AIProvider, StructuredAIResult, AIUsage } from "./aiTypes";

type FetchLike = typeof fetch;
const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const INPUT_COST_PER_TOKEN = process.env.OPENAI_INPUT_COST_USD_PER_TOKEN ? Number(process.env.OPENAI_INPUT_COST_USD_PER_TOKEN) : null;
const OUTPUT_COST_PER_TOKEN = process.env.OPENAI_OUTPUT_COST_USD_PER_TOKEN ? Number(process.env.OPENAI_OUTPUT_COST_USD_PER_TOKEN) : null;

export class OpenAIProvider implements AIProvider {
  constructor(private readonly apiKey = process.env.OPENAI_API_KEY, private readonly fetchImpl: FetchLike = fetch, private readonly model = DEFAULT_MODEL) {}
  async generateStructured<T>(params: { userId: string; system: string; userMessage: string; schemaName: string; schema: Record<string, unknown>; validate: (value: unknown) => T }): Promise<StructuredAIResult<T>> {
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const response = await this.fetchImpl("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: this.model, store: false, user: params.userId, input: [{ role: "system", content: params.system }, { role: "user", content: params.userMessage }], text: { format: { type: "json_schema", name: params.schemaName, schema: params.schema, strict: true } } }) });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const body = await response.json() as { id?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
    const text = body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("OpenAI response did not contain structured output");
    let value: T;
    try { value = params.validate(JSON.parse(text)); } catch { throw new Error("OpenAI returned malformed or schema-invalid structured output"); }
    if (!body.usage) throw new Error("OpenAI response did not include usage");
    const promptTokens = body.usage.input_tokens; const completionTokens = body.usage.output_tokens; const totalTokens = body.usage.total_tokens;
    if (typeof promptTokens !== "number" || typeof completionTokens !== "number" || typeof totalTokens !== "number") throw new Error("OpenAI response returned incomplete usage");
    if (![promptTokens, completionTokens, totalTokens].every((tokens) => Number.isSafeInteger(tokens) && tokens >= 0)) throw new Error("OpenAI returned invalid usage");
    const pricesKnown = INPUT_COST_PER_TOKEN !== null && OUTPUT_COST_PER_TOKEN !== null && [INPUT_COST_PER_TOKEN, OUTPUT_COST_PER_TOKEN].every((price) => Number.isFinite(price) && price >= 0);
    const usage: AIUsage = { provider: "openai", model: this.model, promptTokens, completionTokens, totalTokens, estimatedCostUsd: pricesKnown ? promptTokens * INPUT_COST_PER_TOKEN! + completionTokens * OUTPUT_COST_PER_TOKEN! : null };
    return { value, usage, requestId: body.id ?? null };
  }
}
