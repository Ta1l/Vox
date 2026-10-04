export const AUTH_COOKIE_NAME = "fin_session";

export function configuredAuthToken() {
  const token = process.env.APP_AUTH_TOKEN;
  if (!token) return null;
  if (token.length < 32 || token.length > 512) throw new Error("APP_AUTH_TOKEN must be 32–512 characters");
  return token;
}

export function matchesAuthToken(candidate: string | undefined, expected = configuredAuthToken()) {
  if (!candidate || !expected) return false;
  let difference = candidate.length ^ expected.length;
  const length = Math.max(candidate.length, expected.length);
  for (let index = 0; index < length; index++) difference |= (candidate.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  return difference === 0;
}

export function requestOriginAllowed(request: Request, appUrl = process.env.APP_URL) {
  const origin = request.headers.get("origin");
  if (!origin || !appUrl) return true;
  try { return new URL(origin).origin === new URL(appUrl).origin; } catch { return false; }
}

export function securityHeaders(headers: Headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.NODE_ENV === "production") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return headers;
}
