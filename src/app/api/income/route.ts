import { NextRequest, NextResponse } from "next/server";
import * as incomeService from "@/lib/domain/income/incomeService";
import * as money from "@/lib/money";
import { z } from "zod";

const createIncomeSchema = z.object({
  amountKopecks: z.number().int().positive(),
  source: z.string().max(256).optional(),
  description: z.string().optional(),
  earnedAt: z.string().datetime(),
  expectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createIncomeSchema.parse(body);

    // TODO: Get userId from session after authentication is implemented
    // For now, use a placeholder
    const userId = "00000000-0000-0000-0000-000000000001";

    money.validate(validated.amountKopecks);

    const income = await incomeService.createIncome({
      userId,
      amountKopecks: validated.amountKopecks,
      source: validated.source,
      description: validated.description,
      earnedAt: new Date(validated.earnedAt),
      expectedAt: validated.expectedAt,
    });

    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input", errors: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session
    const userId = "00000000-0000-0000-0000-000000000001";

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const incomes = await incomeService.getIncomeByUser(
      userId,
      status as "EARNED" | "IN_TRANSIT" | "RECEIVED" | "DELAYED" | "CANCELLED" | undefined
    );

    return NextResponse.json(incomes);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
