import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captureError } from "@/lib/observability/logger";

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "healthy", timestamp: new Date().toISOString(), service: "personal-finance-os", checks: { database: { status: "up", latencyMs: Date.now() - startedAt } } });
  } catch (error) {
    captureError("health.database_failed", error);
    return NextResponse.json({ status: "degraded", timestamp: new Date().toISOString(), service: "personal-finance-os", checks: { database: { status: "down" } } }, { status: 503 });
  }
}
