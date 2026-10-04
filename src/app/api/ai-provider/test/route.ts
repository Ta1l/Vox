import { NextResponse } from "next/server";
import { USER_ID } from "@/lib/domain/dashboard/dashboardService";
import { getAIProvider } from "@/lib/domain/ai/aiRequestService";
import { markProviderTested } from "@/lib/domain/ai/providerConfigService";
import { assertAIRateLimit } from "@/lib/security/rateLimit";

export async function POST() {
  try {
    assertAIRateLimit(USER_ID);
    const provider = await getAIProvider(USER_ID);
    const result = await provider.generateStructured({ userId: USER_ID, system: "Reply with a connection status only.", userMessage: "Reply with status ok.", schemaName: "provider_test", schema: { type: "object", properties: { status: { type: "string", enum: ["ok"] } }, required: ["status"], additionalProperties: false }, validate: (value) => { if (!value || typeof value !== "object" || (value as { status?: unknown }).status !== "ok") throw new Error("Invalid test response"); return value as { status: "ok" }; } });
    await markProviderTested(USER_ID);
    return NextResponse.json({ status: "connected", model: result.usage.model });
  } catch { return NextResponse.json({ status: "failed", message: "Provider connection failed" }, { status: 400 }); }
}
