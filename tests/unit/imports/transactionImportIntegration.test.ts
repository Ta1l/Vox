import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bankConnections, bankTransactions } from "@/lib/db/schema/bank";
import { expenseEntries } from "@/lib/db/schema/expenses";
import { users } from "@/lib/db/schema/users";
import { confirmImportedTransaction, importCsv, listImportedTransactions } from "@/lib/domain/imports/transactionImportService";

describe("transaction import staging flow", () => {
  let userId: string;
  beforeAll(async () => { userId = (await db.insert(users).values({ email: `import-${Date.now()}@example.com`, name: "Import", passwordHash: "test" }).returning())[0].id; });
  afterAll(async () => { await db.delete(users).where(eq(users.id, userId)); });

  it("deduplicates a CSV row and only creates an expense after confirmation", async () => {
    const csv = "externalId,date,amount,description\nstatement-1,2026-10-04,-12.50,Кафе";
    const first = await importCsv(userId, csv);
    const second = await importCsv(userId, csv);
    expect(first).toHaveLength(1);
    expect(first[0].importStatus).toBe("REVIEW");
    expect(second[0].importStatus).toBe("DUPLICATE");
    await confirmImportedTransaction(userId, first[0].id);
    await confirmImportedTransaction(userId, first[0].id);
    expect(await db.select().from(expenseEntries).where(eq(expenseEntries.userId, userId))).toHaveLength(1);
    expect(await listImportedTransactions(userId)).toMatchObject([{ importStatus: "CONFIRMED", amountKopecks: -1250 }]);
  });
});
