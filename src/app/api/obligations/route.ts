import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/lib/domain/obligations/obligationService";

const userId = "00000000-0000-0000-0000-000000000001";
const configSchema = z.object({
  intervalDays: z.number().int().positive().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  weekInterval: z.number().int().positive().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
}).optional();
const createSchema = z.object({
  name: z.string().trim().min(1).max(256),
  amountKopecks: z.number().int().positive(),
  recurrenceType: z.enum(["ONE_TIME", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
  recurrenceConfig: configSchema,
  protectionLevel: z.enum(["HARD", "NEGOTIABLE", "FLEXIBLE"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const input = createSchema.parse(await request.json());
    const obligation = await service.createObligation({ ...input, userId });
    return NextResponse.json(obligation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    return NextResponse.json({ message: error instanceof Error ? error.message : "Internal server error" }, { status: error instanceof Error ? 400 : 500 });
  }
}

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ message: "from and to are required" }, { status: 400 });
  try { return NextResponse.json({ occurrences: await service.getOccurrences(userId, from, to) }); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Internal server error" }, { status: 400 }); }
}
