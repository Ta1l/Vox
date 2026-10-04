type Bucket = { startedAt: number; count: number };
const minuteBuckets = new Map<string, Bucket>();
const hourBuckets = new Map<string, Bucket>();

// ponytail: process-local limiter for V1; replace with shared storage during M21 deployment hardening.
export function assertAIRateLimit(identifier: string, now = Date.now()) {
  const minute = minuteBuckets.get(identifier);
  const hour = hourBuckets.get(identifier);
  const currentMinute = minute && now - minute.startedAt < 60_000 ? minute : { startedAt: now, count: 0 };
  const currentHour = hour && now - hour.startedAt < 3_600_000 ? hour : { startedAt: now, count: 0 };
  if (currentMinute.count >= 10 || currentHour.count >= 100) throw new Error("AI rate limit exceeded");
  currentMinute.count++; currentHour.count++;
  minuteBuckets.set(identifier, currentMinute); hourBuckets.set(identifier, currentHour);
}
