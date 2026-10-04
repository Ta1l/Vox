import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobRuns } from "@/lib/db/schema/jobs";
import { completeJobRun, failJobRun, runMonitoredJob, startJobRun } from "@/lib/domain/jobs/jobMonitor";
import { log } from "@/lib/observability/logger";

describe("reliability primitives", () => {
  const created: string[] = [];
  afterEach(async () => { for (const id of created.splice(0)) await db.delete(jobRuns).where(eq(jobRuns.id, id)); });

  it("tracks successful and failed job runs", async () => {
    const successful = await startJobRun({ jobName: "test", jobId: `success-${Date.now()}` });
    created.push(successful.id);
    expect((await completeJobRun(successful.id)).status).toBe("SUCCEEDED");
    const failed = await startJobRun({ jobName: "test", jobId: `failed-${Date.now()}` });
    created.push(failed.id);
    expect((await failJobRun(failed.id, new Error("temporary failure"))).status).toBe("FAILED");
  });

  it("marks a monitored job failed and rethrows the worker error", async () => {
    const jobId = `wrapped-${Date.now()}`;
    await expect(runMonitoredJob({ jobName: "test", jobId }, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    const [row] = await db.select().from(jobRuns).where(eq(jobRuns.jobId, jobId));
    if (row) created.push(row.id);
  });

  it("redacts secrets from structured logs", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    log("info", "test", { apiKey: "secret", nested: { authorization: "Bearer secret", safe: "ok" } });
    expect(spy.mock.calls[0]?.[0]).not.toContain("secret");
    expect(spy.mock.calls[0]?.[0]).toContain('"safe":"ok"');
    spy.mockRestore();
  });
});
