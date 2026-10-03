import { NextResponse } from "next/server";
import { getCycleSummary, updatePlanningCycleStatus } from "@/lib/domain/planning/planningService";
import { z } from "zod";

const userId = "00000000-0000-0000-0000-000000000001";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await getCycleSummary(userId, (await params).id)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Not found" }, { status: 404 }); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const body = z.object({ status: z.enum(["COMPLETED", "CANCELLED"]) }).parse(await request.json()); return NextResponse.json(await updatePlanningCycleStatus(userId, (await params).id, body.status)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid input" }, { status: 400 }); }
}
