import { db } from "@/lib/db/client";
import { aiUsageLog } from "@/lib/db/schema/ai";
import type { AIUsage } from "./aiTypes";
export async function recordAIUsage(userId: string, usage: AIUsage) { const [row] = await db.insert(aiUsageLog).values({ userId, provider: usage.provider, model: usage.model, promptTokens: usage.promptTokens, completionTokens: usage.completionTokens, totalTokens: usage.totalTokens, estimatedCostUsd: usage.estimatedCostUsd?.toFixed(6) }).returning(); return row; }
