import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { simulateUserScenario } from "@/lib/domain/simulation/simulationService";

const positive = z.number().int().positive().safe();
const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PAY_DEBT"), debtId: z.string().uuid(), amountKopecks: positive }),
  z.object({ type: z.literal("CLOSE_DEBT"), debtId: z.string().uuid() }),
  z.object({ type: z.literal("FUND_GOAL"), goalId: z.string().uuid(), amountKopecks: positive }),
  z.object({ type: z.literal("REDUCE_NEGOTIABLE"), occurrenceId: z.string().uuid(), amountKopecks: positive }),
]);
const schema = z.object({ cycleId: z.string().uuid(), actions: z.array(action).max(50) });

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    return NextResponse.json(await simulateUserScenario("00000000-0000-0000-0000-000000000001", body.cycleId, body.actions));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid input" }, { status: 400 });
  }
}
