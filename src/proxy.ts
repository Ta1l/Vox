import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, configuredAuthToken, matchesAuthToken, requestOriginAllowed, securityHeaders } from "@/lib/security/requestSecurity";

type Bucket = { startedAt: number; count: number };
const buckets = new Map<string, Bucket>();

function consume(key: string, limit: number, now = Date.now()) {
  const current = buckets.get(key);
  const bucket = current && now - current.startedAt < 60_000 ? current : { startedAt: now, count: 0 };
  if (bucket.count >= limit) return false;
  bucket.count++;
  buckets.set(key, bucket);
  return true;
}

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function withHeaders(response: NextResponse) {
  securityHeaders(response.headers);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isHealth = pathname === "/api/health";
  const isLogin = pathname === "/login" || pathname === "/api/auth/login";
  const isStatic = pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname === "/manifest.json" || pathname === "/sw.js";
  const method = request.method.toUpperCase();

  if (isApi && !isHealth && !isLogin) {
    const limit = pathname.startsWith("/api/imports/") ? 5 : 60;
    if (!consume(`${clientKey(request)}:${pathname.startsWith("/api/imports/") ? "imports" : "api"}`, limit)) {
      return withHeaders(NextResponse.json({ message: "Too many requests" }, { status: 429 }));
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      if (process.env.NODE_ENV === "production" && !process.env.APP_URL) return withHeaders(NextResponse.json({ message: "Application origin is not configured" }, { status: 503 }));
      if (!requestOriginAllowed(request)) return withHeaders(NextResponse.json({ message: "Invalid request origin" }, { status: 403 }));
    }
  }

  if (process.env.NODE_ENV === "production" && !isHealth && !isLogin && !isStatic) {
    let expected: string | null;
    try { expected = configuredAuthToken(); } catch { expected = null; }
    if (!expected) return withHeaders(isApi ? NextResponse.json({ message: "Authentication is not configured" }, { status: 503 }) : new NextResponse("Authentication is not configured", { status: 503 }));
    if (!matchesAuthToken(request.cookies.get(AUTH_COOKIE_NAME)?.value, expected)) {
      if (isApi) return withHeaders(NextResponse.json({ message: "Authentication required" }, { status: 401 }));
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return withHeaders(NextResponse.redirect(login));
    }
  }

  return withHeaders(NextResponse.next());
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
