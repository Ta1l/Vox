import { NextRequest, NextResponse } from "next/server";
import { getDashboardSnapshot, USER_ID } from "@/lib/domain/dashboard/dashboardService";

export async function GET(request: NextRequest) {
  try {
    const asOfDate = request.nextUrl.searchParams.get("date") ?? undefined;
    return NextResponse.json(await getDashboardSnapshot(USER_ID, asOfDate));
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Internal server error" }, { status: 400 });
  }
}
