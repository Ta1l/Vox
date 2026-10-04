import { NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/lib/domain/notifications/notificationService";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await service.markNotificationRead("00000000-0000-0000-0000-000000000001", z.string().uuid().parse((await params).id))); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Not found" }, { status: 404 }); }
}
