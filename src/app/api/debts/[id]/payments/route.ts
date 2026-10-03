import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/lib/domain/debts/debtService";

const userId = "00000000-0000-0000-0000-000000000001";
const paymentSchema = z.object({ amountKopecks: z.number().int().positive(), paidAt: z.string().datetime().optional(), notes: z.string().optional(), idempotencyKey: z.string().max(256).optional(), expenseId: z.string().uuid().optional() });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; return NextResponse.json(await service.getDebtPayments(userId, id)); }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Debt not found" }, { status: 404 }); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const input = paymentSchema.parse(await request.json());
    return NextResponse.json(await service.payDebt({ ...input, debtId: id, userId, paidAt: input.paidAt ? new Date(input.paidAt) : undefined }), { status: 201 });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Invalid payment" }, { status: 400 }); }
}
