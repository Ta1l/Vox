import { NextRequest, NextResponse } from "next/server";
import * as service from "@/lib/domain/debts/debtService";

const userId = "00000000-0000-0000-0000-000000000001";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; return NextResponse.json(await service.getDebt(userId, id)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Debt not found" }, { status: 404 }); }
}
