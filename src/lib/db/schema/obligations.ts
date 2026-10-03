import { boolean, date, jsonb, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar, index, bigint, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const recurrenceTypeEnum = pgEnum("recurrence_type", ["ONE_TIME", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]);
export const protectionLevelEnum = pgEnum("protection_level", ["HARD", "NEGOTIABLE", "FLEXIBLE"]);
export const occurrenceStatusEnum = pgEnum("occurrence_status", ["PENDING", "PAID", "OVERDUE", "SKIPPED"]);

export type RecurrenceType = (typeof recurrenceTypeEnum.enumValues)[number];
export type ProtectionLevel = (typeof protectionLevelEnum.enumValues)[number];
export type OccurrenceStatus = (typeof occurrenceStatusEnum.enumValues)[number];

export const recurringObligations = pgTable("recurring_obligations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 256 }).notNull(),
  amountKopecks: bigint("amount_kopecks", { mode: "number" }).notNull(),
  recurrenceType: recurrenceTypeEnum("recurrence_type").notNull(),
  recurrenceConfig: jsonb("recurrence_config").$type<RecurrenceConfig>(),
  protectionLevel: protectionLevelEnum("protection_level").notNull().default("FLEXIBLE"),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({
  userActiveIdx: index("idx_obligations_user_active").on(table.userId, table.isActive),
  userStartIdx: index("idx_obligations_user_start").on(table.userId, table.startDate),
  amountPositive: check("chk_obligation_positive", sql`${table.amountKopecks} > 0`),
  validDateRange: check("chk_obligation_date_range", sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`),
}));

export interface RecurrenceConfig {
  intervalDays?: number;
  dayOfWeek?: number;
  weekInterval?: number;
  dayOfMonth?: number;
}

export const paymentOccurrences = pgTable("payment_occurrences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  obligationId: uuid("obligation_id").notNull().references(() => recurringObligations.id, { onDelete: "cascade" }),
  amountKopecks: bigint("amount_kopecks", { mode: "number" }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  status: occurrenceStatusEnum("status").notNull().default("PENDING"),
  protectionLevel: protectionLevelEnum("protection_level").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({
  obligationDateUnique: uniqueIndex("uq_occurrence_obligation_date").on(table.obligationId, table.dueDate),
  userStatusIdx: index("idx_occurrences_user_status").on(table.userId, table.status),
  userDateIdx: index("idx_occurrences_user_date").on(table.userId, table.dueDate),
  userStatusDateIdx: index("idx_occurrences_user_status_date").on(table.userId, table.status, table.dueDate),
  amountPositive: check("chk_occurrence_positive", sql`${table.amountKopecks} > 0`),
  paidHasTimestamp: check("chk_occurrence_paid_date", sql`(${table.status} = 'PAID' AND ${table.paidAt} IS NOT NULL) OR ${table.status} <> 'PAID'`),
}));

export type RecurringObligation = typeof recurringObligations.$inferSelect;
export type NewRecurringObligation = typeof recurringObligations.$inferInsert;
export type PaymentOccurrence = typeof paymentOccurrences.$inferSelect;
