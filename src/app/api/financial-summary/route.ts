import { NextResponse } from "next/server"; import * as service from "@/lib/domain/envelopes/envelopeService";
export async function GET() { return NextResponse.json(await service.getFinancialSnapshot("00000000-0000-0000-0000-000000000001")); }
