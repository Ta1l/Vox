import { pgTable, uuid, bigint, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const expenseEntries = pgTable('expense_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amountKopecks: bigint('amount_kopecks', { mode: 'number' }).notNull(),
  category: varchar('category', { length: 128 }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  comment: text('comment'),
  expenseDate: timestamp('expense_date', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
  userDateIdx: index('idx_expense_user_date').on(table.userId, table.expenseDate),
  userCategoryIdx: index('idx_expense_user_category').on(table.userId, table.category),
}));

export type ExpenseEntry = typeof expenseEntries.$inferSelect;
export type NewExpenseEntry = typeof expenseEntries.$inferInsert;
