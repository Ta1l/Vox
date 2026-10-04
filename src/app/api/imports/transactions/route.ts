import { NextRequest, NextResponse } from "next/server";
import * as service from "@/lib/domain/imports/transactionImportService";

const userId = "00000000-0000-0000-0000-000000000001";

export async function GET() { return NextResponse.json(await service.listImportedTransactions(userId)); }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { csv?: unknown };
    if (typeof body.csv !== "string" || body.csv.length > 2_000_000) return NextResponse.json({ message: "csv is required" }, { status: 400 });
    return NextResponse.json(await service.importCsv(userId, body.csv), { status: 201 });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid CSV" }, { status: 400 }); }
}
