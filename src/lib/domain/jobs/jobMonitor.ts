import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobRuns } from "@/lib/db/schema/jobs";
import { captureError, log, redactForLog } from "@/lib/observability/logger";

export interface JobStart { jobName: string; jobId: string; attempts?: number; metadata?: Record<string, unknown>; }

export async function startJobRun(input: JobStart) {
  const [run] = await db.insert(jobRuns).values({ jobName: input.jobName, jobId: input.jobId, attempts: input.attempts ?? 1, metadata: input.metadata ?? {} }).returning();
  log("info", "job.started", { jobName: input.jobName, jobId: input.jobId, runId: run.id });
  return run;
}

export async function completeJobRun(runId: string) {
  const [run] = await db.update(jobRuns).set({ status: "SUCCEEDED", finishedAt: new Date(), updatedAt: new Date() }).where(eq(jobRuns.id, runId)).returning();
  if (!run) throw new Error("Job run not found");
  log("info", "job.completed", { jobName: run.jobName, jobId: run.jobId, runId });
  return run;
}

export async function failJobRun(runId: string, error: unknown) {
  const message = String(redactForLog(error instanceof Error ? error.message : "Unknown error")).slice(0, 1000);
  const [run] = await db.update(jobRuns).set({ status: "FAILED", errorMessage: message, finishedAt: new Date(), updatedAt: new Date() }).where(eq(jobRuns.id, runId)).returning();
  if (!run) throw new Error("Job run not found");
  captureError("job.failed", error, { jobName: run.jobName, jobId: run.jobId, runId });
  return run;
}

export async function runMonitoredJob<T>(input: JobStart, worker: () => Promise<T>) {
  const run = await startJobRun(input);
  try { const result = await worker(); await completeJobRun(run.id); return result; }
  catch (error) { await failJobRun(run.id, error); throw error; }
}

export async function listRecentJobRuns(jobName?: string, limit = 50) {
  return db.select().from(jobRuns).where(jobName ? and(eq(jobRuns.jobName, jobName)) : undefined).orderBy(desc(jobRuns.startedAt)).limit(Math.min(Math.max(limit, 1), 100));
}
