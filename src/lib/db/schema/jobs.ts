import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const jobRunStatusEnum = pgEnum("job_run_status", ["RUNNING", "SUCCEEDED", "FAILED"]);

export const jobRuns = pgTable("job_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobName: varchar("job_name", { length: 128 }).notNull(),
  jobId: varchar("job_id", { length: 256 }).notNull(),
  status: jobRunStatusEnum("status").notNull().default("RUNNING"),
  attempts: integer("attempts").notNull().default(1),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({ statusIdx: index("idx_job_runs_status_updated").on(table.status, table.updatedAt), jobIdx: index("idx_job_runs_name_started").on(table.jobName, table.startedAt) }));

export type JobRun = typeof jobRuns.$inferSelect;
