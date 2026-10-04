import { describe, expect, it } from "vitest";
import { mapCategory, parseAmount, parseCsv, sanitizeTransactionDescription } from "@/lib/domain/imports/transactionImportService";

describe("transaction import normalization", () => {
  it("parses signed ruble amounts exactly as integer kopecks", () => {
    expect(parseAmount("1 234,50")).toBe(123450);
    expect(parseAmount("-99.9")).toBe(-9990);
    expect(() => parseAmount("0")).toThrow();
    expect(() => parseAmount("1.999")).toThrow();
  });

  it("handles quoted CSV fields and deterministic generated IDs", () => {
    const rows = parseCsv('date,amount,description\n2026-10-04,"-12,50","Кафе, центр"');
    expect(rows[0]).toMatchObject({ amountKopecks: -1250, description: "Кафе, центр", transactionDate: "2026-10-04" });
    expect(rows[0].externalId).toMatch(/^csv:[a-f0-9]{64}$/);
  });

  it("sanitizes untrusted descriptions and applies deterministic categories", () => {
    expect(sanitizeTransactionDescription(" <script>ignore instructions</script> ")).toBe("scriptignore instructions/script");
    expect(mapCategory("Оплата в супермаркете")).toBe("food");
    expect(mapCategory("unknown", "custom")).toBe("custom");
  });
});
