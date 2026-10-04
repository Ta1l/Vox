import { index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const aiUsageLog = pgTable("ai_usage_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 64 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }),
  requestTimestamp: timestamp("request_timestamp", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({ userDateIdx: index("idx_ai_usage_user_date").on(table.userId, table.requestTimestamp), modelIdx: index("idx_ai_usage_provider_model").on(table.provider, table.model) }));

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ userIdx: index("idx_ai_conversations_user").on(table.userId) }));

export const aiMessageRole = pgEnum("ai_message_role", ["user", "assistant"]);
export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: aiMessageRole("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ conversationIdx: index("idx_ai_messages_conversation_date").on(table.conversationId, table.createdAt) }));

export const aiSummaries = pgTable("ai_summaries", {
  conversationId: uuid("conversation_id").primaryKey().references(() => aiConversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  summary: jsonb("summary").notNull(),
  messagesCoveredCount: integer("messages_covered_count").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
