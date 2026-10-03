import { sql } from "drizzle-orm";
import { bigint, check, date, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { protectionLevelEnum } from "./obligations";

export const goalStatusEnum = pgEnum("goal_status", ["ACTIVE", "ON_TRACK", "AT_RISK", "ACHIEVED", "ABANDONED"]);
export type GoalStatus = (typeof goalStatusEnum.enumValues)[number];

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 256 }).notNull(), description: text("description"),
  targetAmountKopecks: bigint("target_amount_kopecks", { mode: "number" }).notNull(), savedAmountKopecks: bigint("saved_amount_kopecks", { mode: "number" }).notNull().default(0),
  deadline: date("deadline", { mode: "string" }), priority: integer("priority").notNull().default(0),
  protectionLevel: protectionLevelEnum("protection_level").notNull().default("FLEXIBLE"), status: goalStatusEnum("status").notNull().default("ACTIVE"),
  version: integer("version").notNull().default(1), createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({ userStatusIdx: index("idx_goals_user_status").on(table.userId, table.status), userDeadlineIdx: index("idx_goals_user_deadline").on(table.userId, table.deadline), userPriorityIdx: index("idx_goals_user_priority").on(table.userId, table.priority), targetPositive: check("chk_goal_target_positive", sql`${table.targetAmountKopecks} > 0`), savedValid: check("chk_goal_saved_valid", sql`${table.savedAmountKopecks} >= 0`) }));

export const goalContributions = pgTable("goal_contributions", {
  id: uuid("id").primaryKey().defaultRandom(), goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountKopecks: bigint("amount_kopecks", { mode: "number" }).notNull(), contributedAt: timestamp("contributed_at", { withTimezone: true, mode: "date" }).notNull(), notes: text("notes"), createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({ goalDateIdx: index("idx_goal_contributions_goal_date").on(table.goalId, table.contributedAt), userDateIdx: index("idx_goal_contributions_user_date").on(table.userId, table.contributedAt), amountPositive: check("chk_goal_contribution_positive", sql`${table.amountKopecks} > 0`) }));

export type Goal = typeof goals.$inferSelect;
export type GoalContribution = typeof goalContributions.$inferSelect;
