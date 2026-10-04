import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/lib/domain/notifications/notificationService";

const userId = "00000000-0000-0000-0000-000000000001";
const schema = z.object({ endpoint: z.string().url(), keys: z.object({ auth: z.string().min(1), p256dh: z.string().min(1) }), userAgent: z.string().max(512).optional() });

export async function POST(request: NextRequest) {
  try { return NextResponse.json(await service.savePushSubscription(userId, schema.parse(await request.json())), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid subscription" }, { status: 400 }); }
}

export async function DELETE(request: NextRequest) {
  const endpoint = request.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ message: "endpoint is required" }, { status: 400 });
  try { return NextResponse.json(await service.deactivatePushSubscription(userId, endpoint)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Not found" }, { status: 404 }); }
}
