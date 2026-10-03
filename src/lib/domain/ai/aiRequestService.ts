import type { AIProvider } from "./aiTypes";
import { recordAIUsage } from "./aiUsageService";

export async function requestValidatedAI<T>(provider: AIProvider, params: { userId: string; system: string; userMessage: string; schemaName: string; schema: Record<string, unknown>; validate: (value: unknown) => T }) {
  const response = await provider.generateStructured<T>(params);
  await recordAIUsage(params.userId, response.usage);
  return response.value;
}
