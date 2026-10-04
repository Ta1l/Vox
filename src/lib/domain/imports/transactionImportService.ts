import { createHash } from "node:crypto";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bankConnections, bankTransactions, type BankTransaction } from "@/lib/db/schema/bank";
import { incomeEntries } from "@/lib/db/schema/income";
import { expenseEntries } from "@/lib/db/schema/expenses";
import * as money from "@/lib/money";
import type { BankProvider } from "@/lib/domain/bank/bankProvider";

export interface ImportedTransactionRow { externalId: string; amountKopecks: number; transactionDate: string; description: string; categoryHint?: string; }

const MAX_DESCRIPTION_LENGTH = 500;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeTransactionDescription(value: string | undefined) {
  return (value ?? "").slice(0, MAX_DESCRIPTION_LENGTH).replace(/[<>]/g, "").trim();
}

function parseDate(value: string) {
  if (!DATE_RE.test(value)) throw new Error("Invalid transaction date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Invalid transaction date");
  return value;
}

function parseRubles(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Amount must be an integer kopeck value or decimal ruble value");
  const sign = match[1] === "-" ? -1 : 1;
  const kopecks = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  const amount = sign * kopecks;
  if (!Number.isSafeInteger(amount) || amount === 0) throw new Error("Amount must be a non-zero safe integer in kopecks");
  return money.validate(amount);
}

export function parseAmount(value: string, field: "amount" | "amountKopecks" = "amount") {
  if (field === "amountKopecks") {
    if (!/^-?\d+$/.test(value.trim())) throw new Error("amountKopecks must be an integer");
    const amount = Number(value.trim());
    if (!Number.isSafeInteger(amount) || amount === 0) throw new Error("amountKopecks must be a non-zero safe integer");
    return money.validate(amount);
  }
  return parseRubles(value);
}

function parseCsvLine(line: string) {
  const values: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i++; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { values.push(value); value = ""; continue; }
    value += char;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  values.push(value);
  return values;
}

export function parseCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV must contain a header and at least one row");
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const dateIndex = headers.findIndex((header) => ["date", "transaction_date", "transactiondate"].includes(header));
  const amountKopecksIndex = headers.indexOf("amountkopecks");
  const amountIndex = headers.indexOf("amount");
  if (dateIndex < 0 || (amountIndex < 0 && amountKopecksIndex < 0)) throw new Error("CSV requires date and amount or amountKopecks columns");
  const index = (names: string[]) => headers.findIndex((header) => names.includes(header));
  const externalIdIndex = index(["externalid", "external_id", "id"]);
  const descriptionIndex = index(["description", "comment", "memo"]);
  const categoryIndex = index(["category", "categoryhint", "category_hint"]);
  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const get = (position: number) => position >= 0 ? values[position] ?? "" : "";
    try {
      const date = parseDate(get(dateIndex));
      const amountKopecks = parseAmount(get(amountKopecksIndex >= 0 ? amountKopecksIndex : amountIndex), amountKopecksIndex >= 0 ? "amountKopecks" : "amount");
      const description = sanitizeTransactionDescription(get(descriptionIndex));
      const externalId = get(externalIdIndex).trim().slice(0, 256);
      const fingerprint = createHash("sha256").update(`${date}|${amountKopecks}|${description}`).digest("hex");
      return { externalId: externalId || `csv:${fingerprint}`, amountKopecks, transactionDate: date, description, categoryHint: sanitizeTransactionDescription(get(categoryIndex)).slice(0, 128) };
    } catch (error) { throw new Error(`CSV row ${rowIndex + 2}: ${error instanceof Error ? error.message : "invalid row"}`); }
  });
}

export function mapCategory(description: string, hint?: string) {
  if (hint) return hint.slice(0, 128);
  const text = description.toLowerCase();
  if (/(food|ресторан|кафе|продукт|супермаркет|market)/i.test(text)) return "food";
  if (/(taxi|метро|транспорт|bus|авто|бензин|fuel)/i.test(text)) return "transport";
  if (/(аренд|жкх|коммун|internet|интернет|rent)/i.test(text)) return "housing";
  if (/(зарплат|salary|аванс|income)/i.test(text)) return "income";
  return "other";
}

async function getOrCreateManualConnection(userId: string, providerName = "manual-csv") {
  const [connection] = await db.insert(bankConnections).values({ userId, providerName, bankName: providerName === "manual-csv" ? "Manual CSV" : providerName }).onConflictDoNothing({ target: [bankConnections.userId, bankConnections.providerName] }).returning();
  if (connection) return connection;
  const existing = await db.query.bankConnections.findFirst({ where: and(eq(bankConnections.userId, userId), eq(bankConnections.providerName, providerName)) });
  if (!existing) throw new Error("Unable to create import connection");
  return existing;
}

async function findMatch(userId: string, row: { amountKopecks: number; transactionDate: string }) {
  const dateStart = new Date(`${row.transactionDate}T00:00:00.000Z`); const dateEnd = new Date(dateStart); dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
  const amount = Math.abs(row.amountKopecks);
  if (row.amountKopecks >= 0) {
    const [income] = await db.select({ id: incomeEntries.id }).from(incomeEntries).where(and(eq(incomeEntries.userId, userId), eq(incomeEntries.amountKopecks, amount), gte(incomeEntries.earnedAt, dateStart), lt(incomeEntries.earnedAt, dateEnd))).limit(1);
    return { incomeId: income?.id };
  }
  const [expense] = await db.select({ id: expenseEntries.id }).from(expenseEntries).where(and(eq(expenseEntries.userId, userId), eq(expenseEntries.amountKopecks, amount), gte(expenseEntries.expenseDate, dateStart), lt(expenseEntries.expenseDate, dateEnd))).limit(1);
  return { expenseId: expense?.id };
}

export async function importCsv(userId: string, csv: string) {
  return importRows(userId, parseCsv(csv), "manual-csv");
}

export async function importRows(userId: string, rows: ImportedTransactionRow[], providerName = "manual-csv") {
  const connection = await getOrCreateManualConnection(userId, providerName);
  const imported: BankTransaction[] = [];
  for (const row of rows) {
    const existing = await db.query.bankTransactions.findFirst({ where: and(eq(bankTransactions.connectionId, connection.id), eq(bankTransactions.externalId, row.externalId)) });
    if (existing) { imported.push({ ...existing, importStatus: "DUPLICATE" }); continue; }
    const match = await findMatch(userId, row);
    const [created] = await db.insert(bankTransactions).values({ userId, connectionId: connection.id, ...row, categoryHint: mapCategory(row.description, row.categoryHint), matchedIncomeId: match.incomeId, matchedExpenseId: match.expenseId, importStatus: match.incomeId || match.expenseId ? "MATCHED" : "REVIEW" }).returning();
    imported.push(created);
  }
  await db.update(bankConnections).set({ lastSyncAt: new Date() }).where(eq(bankConnections.id, connection.id));
  return imported;
}

export async function importFromProvider(userId: string, provider: BankProvider) {
  return importRows(userId, await provider.fetchTransactions(), provider.providerName);
}

export async function listImportedTransactions(userId: string) { return db.query.bankTransactions.findMany({ where: eq(bankTransactions.userId, userId), orderBy: [asc(bankTransactions.transactionDate), asc(bankTransactions.createdAt)] }); }

export async function confirmImportedTransaction(userId: string, id: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(bankTransactions).where(and(eq(bankTransactions.id, id), eq(bankTransactions.userId, userId))).for("update");
    if (!row) throw new Error("Imported transaction not found");
    if (["CONFIRMED", "DUPLICATE", "REJECTED"].includes(row.importStatus)) return row;
    if (row.matchedIncomeId || row.matchedExpenseId) return (await tx.update(bankTransactions).set({ importStatus: "CONFIRMED", updatedAt: new Date() }).where(eq(bankTransactions.id, id)).returning())[0];
    await tx.execute(sql`select id from users where id = ${userId} for update`);
    if (row.amountKopecks >= 0) {
      const [income] = await tx.insert(incomeEntries).values({ userId, amountKopecks: row.amountKopecks, status: "RECEIVED", source: "bank-import", description: row.description, earnedAt: new Date(`${row.transactionDate}T00:00:00.000Z`), receivedAt: new Date(`${row.transactionDate}T00:00:00.000Z`) }).returning();
      return (await tx.update(bankTransactions).set({ matchedIncomeId: income.id, importStatus: "CONFIRMED", updatedAt: new Date() }).where(eq(bankTransactions.id, id)).returning())[0];
    }
    const [expense] = await tx.insert(expenseEntries).values({ userId, amountKopecks: Math.abs(row.amountKopecks), category: row.categoryHint ?? "other", title: row.description?.slice(0, 256) || "Imported transaction", comment: "Imported from bank statement", expenseDate: new Date(`${row.transactionDate}T00:00:00.000Z`) }).returning();
    return (await tx.update(bankTransactions).set({ matchedExpenseId: expense.id, importStatus: "CONFIRMED", updatedAt: new Date() }).where(eq(bankTransactions.id, id)).returning())[0];
  });
}

export async function rejectImportedTransaction(userId: string, id: string) {
  const [updated] = await db.update(bankTransactions).set({ importStatus: "REJECTED", updatedAt: new Date() }).where(and(eq(bankTransactions.id, id), eq(bankTransactions.userId, userId))).returning();
  if (!updated) throw new Error("Imported transaction not found");
  return updated;
}
