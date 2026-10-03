import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { protectionLevelEnum } from "./obligations";

export const budgetEnvelopes = pgTable("budget_envelopes", {
  id: uuid("id").primaryKey().defaultRandom(), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 256 }).notNull(), description: text("description"), targetAmountKopecks: bigint("target_amount_kopecks", { mode: "number" }).notNull(), fundedAmountKopecks: bigint("funded_amount_kopecks", { mode: "number" }).notNull().default(0), spentAmountKopecks: bigint("spent_amount_kopecks", { mode: "number" }).notNull().default(0), protectionLevel: protectionLevelEnum("protection_level").notNull().default("NEGOTIABLE"), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow(),
}, (table) => ({ userActiveIdx: index("idx_envelopes_user_active").on(table.userId, table.isActive), userProtectionIdx: index("idx_envelopes_user_protection").on(table.userId, table.protectionLevel), targetValid: check("chk_envelope_target_valid", sql`${table.targetAmountKopecks} >= 0`), fundedValid: check("chk_envelope_funded_valid", sql`${table.fundedAmountKopecks} >= 0`), spentValid: check("chk_envelope_spent_valid", sql`${table.spentAmountKopecks} >= 0 AND ${table.spentAmountKopecks} <= ${table.fundedAmountKopecks}`) }));

export type BudgetEnvelope = typeof budgetEnvelopes.$inferSelect;
