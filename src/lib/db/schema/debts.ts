import { sql } from "drizzle-orm";
import { bigint, check, date, integer, index, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { expenseEntries } from "./expenses";

export const debtStatusEnum = pgEnum("debt_status", ["ACTIVE", "ON_TRACK", "BEHIND", "CLOSED", "DEFAULTED"]);
export type DebtStatus = (typeof debtStatusEnum.enumValues)[number];

export interface DebtSchedule {
  intervalDays?: number;
  dayOfMonth?: number;
}

export const debts = pgTable("debts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 256 }).notNull(),
  creditor: varchar("creditor", { length: 256 }),
  originalAmountKopecks: bigint("original_amount_kopecks", { mode: "number" }).notNull(),
  currentBalanceKopecks: bigint("current_balance_kopecks", { mode: "number" }).notNull(),
  minimumPaymentKopecks: bigint("minimum_payment_kopecks", { mode: "number" }),
  dueDate: date("due_date", { mode: "string" }),
  interestRatePercent: numeric("interest_rate_percent", { precision: 5, scale: 2, mode: "number" }),
  schedule: jsonb("schedule").$type<DebtSchedule>(),
  priority: integer("priority").notNull().default(0),
  status: debtStatusEnum("status").notNull().default("ACTIVE"),
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({
  userStatusIdx: index("idx_debts_user_status").on(table.userId, table.status),
  userPriorityIdx: index("idx_debts_user_priority").on(table.userId, table.priority),
  userDueDateIdx: index("idx_debts_user_due_date").on(table.userId, table.dueDate),
  originalPositive: check("chk_debt_original_positive", sql`${table.originalAmountKopecks} > 0`),
  balanceValid: check("chk_debt_balance_valid", sql`${table.currentBalanceKopecks} >= 0 AND ${table.currentBalanceKopecks} <= ${table.originalAmountKopecks}`),
  minimumValid: check("chk_debt_minimum_valid", sql`${table.minimumPaymentKopecks} IS NULL OR ${table.minimumPaymentKopecks} >= 0`),
  interestValid: check("chk_debt_interest_valid", sql`${table.interestRatePercent} IS NULL OR ${table.interestRatePercent} >= 0`),
}));

export const debtPayments = pgTable("debt_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  debtId: uuid("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  expenseId: uuid("expense_id").references(() => expenseEntries.id, { onDelete: "set null" }),
  amountKopecks: bigint("amount_kopecks", { mode: "number" }).notNull(),
  previousBalanceKopecks: bigint("previous_balance_kopecks", { mode: "number" }).notNull(),
  newBalanceKopecks: bigint("new_balance_kopecks", { mode: "number" }).notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }).notNull(),
  notes: text("notes"),
  idempotencyKey: varchar("idempotency_key", { length: 256 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({
  debtDateIdx: index("idx_debt_payments_debt_date").on(table.debtId, table.paidAt),
  userDateIdx: index("idx_debt_payments_user_date").on(table.userId, table.paidAt),
  idempotencyUnique: uniqueIndex("uq_debt_payments_user_idempotency").on(table.userId, table.idempotencyKey),
  amountPositive: check("chk_debt_payment_positive", sql`${table.amountKopecks} > 0`),
  balanceArithmetic: check("chk_debt_payment_arithmetic", sql`${table.newBalanceKopecks} = ${table.previousBalanceKopecks} - ${table.amountKopecks}`),
}));

export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;
export type DebtPayment = typeof debtPayments.$inferSelect;
