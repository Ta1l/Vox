import { pgTable, uuid, bigint, varchar, text, timestamp, date, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const incomeStatusEnum = ['EARNED', 'IN_TRANSIT', 'RECEIVED', 'DELAYED', 'CANCELLED'] as const;
export type IncomeStatus = typeof incomeStatusEnum[number];

export const incomeEntries = pgTable('income_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amountKopecks: bigint('amount_kopecks', { mode: 'number' }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('EARNED').$type<IncomeStatus>(),
  source: varchar('source', { length: 256 }),
  description: text('description'),
  earnedAt: timestamp('earned_at', { withTimezone: true, mode: 'date' }).notNull(),
  expectedAt: date('expected_at', { mode: 'string' }),
  receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
  userStatusIdx: index('idx_income_user_status').on(table.userId, table.status),
  userEarnedIdx: index('idx_income_user_earned').on(table.userId, table.earnedAt),
  userExpectedIdx: index('idx_income_user_expected').on(table.userId, table.expectedAt),
  userReceivedIdx: index('idx_income_user_received').on(table.userId, table.receivedAt),
}));

export type IncomeEntry = typeof incomeEntries.$inferSelect;
export type NewIncomeEntry = typeof incomeEntries.$inferInsert;
