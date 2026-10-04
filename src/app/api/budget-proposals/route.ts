import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { USER_ID } from "@/lib/domain/dashboard/dashboardService";
import { validateBudgetProposal } from "@/lib/domain/ai/budgetProposalService";

const requestSchema = z.object({ cycleId: z.string().uuid(), proposal: z.unknown() }).strict();
export async function POST(request: NextRequest) { try { const body = requestSchema.parse(await request.json()); return NextResponse.json(await validateBudgetProposal(USER_ID, body.cycleId, body.proposal)); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid proposal" }, { status: 400 }); } }
