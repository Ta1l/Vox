import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const aiProviderConfigs = pgTable("ai_provider_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baseUrl: text("base_url").notNull(),
  modelName: varchar("model_name", { length: 128 }).notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true, mode: "date" }),
}, (table) => ({ userIdx: index("idx_ai_provider_configs_user").on(table.userId), onePerUser: uniqueIndex("uq_ai_provider_configs_user").on(table.userId) }));

export type AIProviderConfigRow = typeof aiProviderConfigs.$inferSelect;
