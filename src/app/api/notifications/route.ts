import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/lib/domain/notifications/notificationService";

const userId = "00000000-0000-0000-0000-000000000001";
const scheduleSchema = z.object({ asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export async function GET(request: NextRequest) {
  const rawStatus = request.nextUrl.searchParams.get("status");
  const status = rawStatus ? z.enum(["PENDING", "SENT", "FAILED", "READ"]).parse(rawStatus) : undefined;
  return NextResponse.json(await service.listNotifications(userId, status));
}

export async function POST(request: NextRequest) {
  try { const input = scheduleSchema.parse(await request.json()); return NextResponse.json(await service.scheduleNotifications(userId, input.asOfDate)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid input" }, { status: 400 }); }
}
