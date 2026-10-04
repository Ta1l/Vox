import { NextRequest, NextResponse } from "next/server";
import { USER_ID } from "@/lib/domain/dashboard/dashboardService";
import { approveBudgetProposal, generateBudgetProposal } from "@/lib/domain/ai/budgetProposalService";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; const body = await request.json() as { action?: "approve"; proposal?: unknown }; if (body.action === "approve") return NextResponse.json(await approveBudgetProposal(USER_ID, id, body.proposal)); return NextResponse.json(await generateBudgetProposal(USER_ID, id)); }
  catch (error) { const message = error instanceof Error ? error.message : "Unable to process proposal"; return NextResponse.json({ message }, { status: message.includes("OPENAI_API_KEY") ? 503 : 400 }); }
}
