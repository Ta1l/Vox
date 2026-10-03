import { NextRequest, NextResponse } from "next/server";
import * as service from "@/lib/domain/obligations/obligationService";

const userId = "00000000-0000-0000-0000-000000000001";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const through = request.nextUrl.searchParams.get("through");
    if (!through) return NextResponse.json({ message: "through is required" }, { status: 400 });
    return NextResponse.json({ occurrences: await service.generateOccurrences(id, userId, through) });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Internal server error" }, { status: 400 }); }
}
