import { sql } from "drizzle-orm";
import { bigint, boolean, check, date, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const cycleStatusEnum = pgEnum("cycle_status", ["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]);
export type CycleStatus = (typeof cycleStatusEnum.enumValues)[number];
export const allocationTargetTypeEnum = pgEnum("allocation_target_type", ["GENERAL", "DEBT", "GOAL", "ENVELOPE", "OBLIGATION"]);
export type AllocationTargetType = (typeof allocationTargetTypeEnum.enumValues)[number];

export const planningCycles = pgTable("planning_cycles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  openingBalanceKopecks: bigint("opening_balance_kopecks", { mode: "number" }).notNull(),
  expectedIncomeKopecks: bigint("expected_income_kopecks", { mode: "number" }).notNull().default(0),
  status: cycleStatusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({
  activePerUser: uniqueIndex("uq_planning_cycles_user_active").on(table.userId).where(sql`${table.status} = 'ACTIVE'`),
  userStatusIdx: index("idx_planning_cycles_user_status").on(table.userId, table.status),
  userStartIdx: index("idx_planning_cycles_user_start").on(table.userId, table.startDate),
  expectedValid: check("chk_planning_cycle_expected_nonnegative", sql`${table.expectedIncomeKopecks} >= 0`),
  dateRangeValid: check("chk_planning_cycle_date_range", sql`${table.endDate} > ${table.startDate}`),
}));

export const budgetAllocations = pgTable("budget_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  cycleId: uuid("cycle_id").notNull().references(() => planningCycles.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: allocationTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id"),
  amountKopecks: bigint("amount_kopecks", { mode: "number" }).notNull(),
  reason: text("reason"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  snapshotVersion: varchar("snapshot_version", { length: 64 }),
  idempotencyKey: varchar("idempotency_key", { length: 256 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({
  cycleIdx: index("idx_budget_allocations_cycle").on(table.cycleId),
  userCycleIdx: index("idx_budget_allocations_user_cycle").on(table.userId, table.cycleId),
  targetIdx: index("idx_budget_allocations_target").on(table.targetType, table.targetId),
  idempotencyUnique: uniqueIndex("uq_budget_allocations_cycle_idempotency").on(table.cycleId, table.idempotencyKey),
  amountPositive: check("chk_budget_allocation_positive", sql`${table.amountKopecks} > 0`),
  targetValid: check("chk_budget_allocation_target", sql`(${table.targetType} = 'GENERAL' AND ${table.targetId} IS NULL) OR (${table.targetType} <> 'GENERAL' AND ${table.targetId} IS NOT NULL)`),
}));

export type PlanningCycle = typeof planningCycles.$inferSelect;
export type NewPlanningCycle = typeof planningCycles.$inferInsert;
export type BudgetAllocation = typeof budgetAllocations.$inferSelect;
export type NewBudgetAllocation = typeof budgetAllocations.$inferInsert;
