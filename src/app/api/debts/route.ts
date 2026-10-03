import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/lib/domain/debts/debtService";

const userId = "00000000-0000-0000-0000-000000000001";
const scheduleSchema = z.object({ intervalDays: z.number().int().positive().optional(), dayOfMonth: z.number().int().min(1).max(31).optional() }).optional();
const createSchema = z.object({
  name: z.string().trim().min(1).max(256),
  creditor: z.string().max(256).optional(),
  originalAmountKopecks: z.number().int().positive(),
  currentBalanceKopecks: z.number().int().nonnegative().optional(),
  minimumPaymentKopecks: z.number().int().nonnegative().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  interestRatePercent: z.number().nonnegative().optional(),
  schedule: scheduleSchema,
  priority: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try { return NextResponse.json(await service.createDebt({ ...(createSchema.parse(await request.json())), userId }), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid input" }, { status: 400 }); }
}

export async function GET() {
  try { return NextResponse.json(await service.getDebts(userId)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Internal server error" }, { status: 500 }); }
}
