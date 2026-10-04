import { describe, expect, it } from "vitest";
import { assertAIRateLimit } from "@/lib/security/rateLimit";

describe("AI rate limit", () => {
  it("allows ten requests per minute and rejects the eleventh", () => {
    const id = `rate-${Date.now()}`; const now = Date.now();
    for (let i = 0; i < 10; i++) assertAIRateLimit(id, now);
    expect(() => assertAIRateLimit(id, now)).toThrow("rate limit");
    expect(() => assertAIRateLimit(id, now + 60_001)).not.toThrow();
  });
});
