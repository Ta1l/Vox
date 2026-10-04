import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { USER_ID } from "@/lib/domain/dashboard/dashboardService";
import { deleteProviderConfig, getProviderConfigMetadata, saveProviderConfig, setProviderEnabled } from "@/lib/domain/ai/providerConfigService";

const schema = z.object({ baseUrl: z.string().max(512), apiKey: z.string().min(8).max(512), modelName: z.string().min(1).max(128) }).strict();
const enabledSchema = z.object({ isEnabled: z.boolean() }).strict();

export async function GET() { return NextResponse.json(await getProviderConfigMetadata(USER_ID)); }

export async function POST(request: NextRequest) {
  try { return NextResponse.json(await saveProviderConfig(USER_ID, schema.parse(await request.json()))); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid provider configuration" }, { status: 400 }); }
}

export async function PATCH(request: NextRequest) {
  try { return NextResponse.json(await setProviderEnabled(USER_ID, enabledSchema.parse(await request.json()).isEnabled)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid provider state" }, { status: 400 }); }
}

export async function DELETE() { await deleteProviderConfig(USER_ID); return NextResponse.json({ status: "deleted" }); }
