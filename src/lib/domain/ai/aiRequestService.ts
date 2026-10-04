import type { AIProvider } from "./aiTypes";
import { recordAIUsage } from "./aiUsageService";
import { OpenAIProvider } from "./openaiProvider";
import { CustomOpenAICompatibleProvider } from "./customOpenAIProvider";
import { getProviderConfig } from "./providerConfigService";
import { assertAIRateLimit } from "@/lib/security/rateLimit";

export async function getAIProvider(userId: string): Promise<AIProvider> {
  const custom = await getProviderConfig(userId);
  if (custom) return new CustomOpenAICompatibleProvider(custom);
  if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
  throw new Error("No AI provider configured");
}

export async function requestValidatedAI<T>(provider: AIProvider, params: { userId: string; system: string; userMessage: string; schemaName: string; schema: Record<string, unknown>; validate: (value: unknown) => T }) {
  assertAIRateLimit(params.userId);
  const response = await provider.generateStructured<T>(params);
  await recordAIUsage(params.userId, response.usage);
  return response.value;
}
