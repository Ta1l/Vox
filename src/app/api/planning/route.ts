import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/lib/domain/planning/planningService";

const userId = "00000000-0000-0000-0000-000000000001";
const createSchema = z.object({ startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), status: z.enum(["DRAFT", "ACTIVE"]).optional() });
const allocationSchema = z.object({ cycleId: z.string().uuid(), targetType: z.enum(["GENERAL", "DEBT", "GOAL", "ENVELOPE", "OBLIGATION"]), targetId: z.string().uuid().optional(), amountKopecks: z.number().int().positive(), reason: z.string().optional(), idempotencyKey: z.string().max(256).optional() });

export async function GET() { return NextResponse.json(await service.getPlanningCycles(userId)); }

export async function POST(request: NextRequest) {
  try { return NextResponse.json(await service.createPlanningCycle({ ...createSchema.parse(await request.json()), userId }), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid input" }, { status: 400 }); }
}

export async function PUT(request: NextRequest) {
  try { return NextResponse.json(await service.createAllocation({ ...allocationSchema.parse(await request.json()), userId })); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid input" }, { status: 400 }); }
}
