import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationStatusEnum = pgEnum("notification_status", ["PENDING", "SENT", "FAILED", "READ"]);
export const notificationTypeEnum = pgEnum("notification_type", ["PAYMENT_DUE", "INSUFFICIENT_RESERVE", "OVERDUE_PAYMENT", "INCOME_EXPECTED", "INCOME_DELAYED", "WEEKLY_BUDGET_WARNING"]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 64 }),
  relatedEntityId: uuid("related_entity_id"),
  status: notificationStatusEnum("status").notNull().default("PENDING"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: "date" }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
  readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({ userStatusIdx: index("idx_notifications_user_status").on(table.userId, table.status), scheduledIdx: index("idx_notifications_scheduled").on(table.status, table.scheduledFor), dedupeIdx: uniqueIndex("uq_notifications_user_type_entity_schedule").on(table.userId, table.type, table.relatedEntityId, table.scheduledFor) }));

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  keysAuth: text("keys_auth").notNull(),
  keysP256dh: text("keys_p256dh").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({ userActiveIdx: index("idx_push_subscriptions_user_active").on(table.userId, table.isActive) }));
