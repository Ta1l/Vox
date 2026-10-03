import { describe, it, expect } from "vitest";
import { db, sql as pgClient } from "@/lib/db/client";

describe("Database connection", () => {
  it("should connect to database", async () => {
    const result = await pgClient`SELECT 1 as value`;
    expect(result[0].value).toBe(1);
  });

  it("should query users table", async () => {
    // Table should exist but be empty
    const result = await db.query.users.findMany();
    expect(Array.isArray(result)).toBe(true);
  });
});
