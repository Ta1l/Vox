import { describe, expect, it } from "vitest";
import { CsvProvider, ManualProvider } from "@/lib/domain/bank/bankProvider";

describe("BankProvider adapters", () => {
  it("normalizes CSV through the provider boundary without database access", async () => {
    const provider = new CsvProvider("date,amount,description\n2026-10-04,-1.25,Кафе");
    expect(provider.providerName).toBe("csv");
    await expect(provider.fetchTransactions()).resolves.toMatchObject([{ amountKopecks: -125, transactionDate: "2026-10-04" }]);
  });

  it("copies manual rows so callers cannot mutate provider state", async () => {
    const rows = [{ externalId: "1", amountKopecks: 100, transactionDate: "2026-10-04", description: "salary" }];
    const result = await new ManualProvider(rows).fetchTransactions();
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });
});
