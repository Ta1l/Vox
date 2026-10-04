type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const SENSITIVE_KEY = /(authorization|api.?key|password|passphrase|secret|token|cookie|connection|string|private.?key)/i;
const SENSITIVE_TEXT = /(Bearer\s+)[^\s]+|(sk-[A-Za-z0-9_-]+)|((?:password|token|secret|api[_-]?key)=)[^\s,;]+/gi;

function redactText(value: string) { return value.replace(SENSITIVE_TEXT, (_match, prefix?: string, _key?: string, assignment?: string) => `${prefix ?? assignment ?? "secret="}[REDACTED]`); }

function redact(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactText(value);
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, key, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey, depth + 1)]));
}

export function log(level: LogLevel, event: string, context: LogContext = {}) {
  const payload = { timestamp: new Date().toISOString(), level, event, ...redact(context) as LogContext };
  console.log(JSON.stringify(payload));
}

export function captureError(event: string, error: unknown, context: LogContext = {}) {
  const details = error instanceof Error ? { name: error.name, message: error.message } : { message: "Unknown error" };
  log("error", event, { ...context, error: details });
}

export function redactForLog(value: unknown) { return redact(value); }
