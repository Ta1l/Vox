import { bigint, boolean, date, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { incomeEntries } from "./income";
import { expenseEntries } from "./expenses";

export const importStatusEnum = pgEnum("import_status", ["PENDING", "MATCHED", "REVIEW", "CONFIRMED", "REJECTED", "DUPLICATE"]);

export const bankConnections = pgTable("bank_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerName: varchar("provider_name", { length: 128 }).notNull(),
  bankName: varchar("bank_name", { length: 256 }),
  accountNumberMasked: varchar("account_number_masked", { length: 64 }),
  connectionConfig: jsonb("connection_config"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true, mode: "date" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({ userActiveIdx: index("idx_bank_connections_user_active").on(table.userId, table.isActive), manualProviderIdx: uniqueIndex("uq_bank_connections_user_provider").on(table.userId, table.providerName) }));

export const bankTransactions = pgTable("bank_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connectionId: uuid("connection_id").references(() => bankConnections.id, { onDelete: "cascade" }),
  externalId: varchar("external_id", { length: 256 }),
  amountKopecks: bigint("amount_kopecks", { mode: "number" }).notNull(),
  transactionDate: date("transaction_date", { mode: "string" }).notNull(),
  description: text("description"),
  categoryHint: varchar("category_hint", { length: 128 }),
  matchedIncomeId: uuid("matched_income_id").references(() => incomeEntries.id, { onDelete: "set null" }),
  matchedExpenseId: uuid("matched_expense_id").references(() => expenseEntries.id, { onDelete: "set null" }),
  importStatus: importStatusEnum("import_status").notNull().default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({ dedupeIdx: uniqueIndex("uq_bank_transactions_connection_external").on(table.connectionId, table.externalId), userStatusIdx: index("idx_bank_transactions_user_status").on(table.userId, table.importStatus), userDateIdx: index("idx_bank_transactions_user_date").on(table.userId, table.transactionDate) }));

export type BankTransaction = typeof bankTransactions.$inferSelect;
