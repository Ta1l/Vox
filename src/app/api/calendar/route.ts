import { NextRequest, NextResponse } from "next/server";
import * as calendarService from "@/lib/domain/calendar/calendarService";

export async function GET(request: NextRequest) {
  try {
    const userId = "00000000-0000-0000-0000-000000000001";
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    const events = await calendarService.getMonthEvents(userId, year, month);
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
