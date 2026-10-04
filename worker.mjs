const intervalMs = Number(process.env.WORKER_HEARTBEAT_MS || 60_000);
const log = (event, context = {}) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: "info", event, ...context }));
log("worker.started", { intervalMs });
const heartbeat = setInterval(() => log("worker.heartbeat"), intervalMs);
const shutdown = (signal) => { clearInterval(heartbeat); log("worker.stopped", { signal }); process.exit(0); };
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
