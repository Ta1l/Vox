import { NextRequest, NextResponse } from "next/server";
import * as calendarService from "@/lib/domain/calendar/calendarService";
import { z } from "zod";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export async function GET(request: NextRequest) {
  try {
    const userId = "00000000-0000-0000-0000-000000000001";
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const { year, month } = querySchema.parse({
      year: searchParams.get("year") || now.getFullYear(),
      month: searchParams.get("month") || now.getMonth() + 1,
    });

    const events = await calendarService.getMonthEvents(userId, year, month);
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid calendar query", errors: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
