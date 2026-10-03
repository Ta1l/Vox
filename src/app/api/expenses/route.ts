import { NextRequest, NextResponse } from "next/server";
import * as expenseService from "@/lib/domain/expenses/expenseService";
import { z } from "zod";

const createExpenseSchema = z.object({
  amountKopecks: z.number().int().positive(),
  category: z.string().max(128),
  title: z.string().max(256),
  comment: z.string().optional(),
  expenseDate: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createExpenseSchema.parse(body);

    const userId = "00000000-0000-0000-0000-000000000001";

    const expense = await expenseService.createExpense({
      userId,
      amountKopecks: validated.amountKopecks,
      category: validated.category,
      title: validated.title,
      comment: validated.comment,
      expenseDate: new Date(validated.expenseDate),
    });

    return NextResponse.json(expense, { status: 201 });
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
    const userId = "00000000-0000-0000-0000-000000000001";
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;

    const expenses = await expenseService.getExpensesByUser(userId, category);
    return NextResponse.json(expenses);
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
