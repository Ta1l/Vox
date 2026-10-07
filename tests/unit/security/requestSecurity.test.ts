import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { configuredAuthToken, matchesAuthToken, requestOriginAllowed, securityHeaders } from "@/lib/security/requestSecurity";

describe("request security", () => {
  const previous = process.env.APP_AUTH_TOKEN;
  afterEach(() => { vi.unstubAllEnvs(); if (previous === undefined) delete process.env.APP_AUTH_TOKEN; else process.env.APP_AUTH_TOKEN = previous; });

  it("blocks unauthenticated production API requests at the proxy", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_AUTH_TOKEN", "x".repeat(32));
    const response = proxy(new NextRequest("https://fin.example/api/ai-provider/config"));
    expect(response.status).toBe(401);
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("requires a sufficiently strong production token and compares it safely", () => {
    process.env.APP_AUTH_TOKEN = "x".repeat(32);
    expect(configuredAuthToken()).toBe(process.env.APP_AUTH_TOKEN);
    expect(matchesAuthToken(process.env.APP_AUTH_TOKEN)).toBe(true);
    expect(matchesAuthToken("wrong")).toBe(false);
    process.env.APP_AUTH_TOKEN = "short";
    expect(() => configuredAuthToken()).toThrow("APP_AUTH_TOKEN");
  });

  it("allows same-origin requests and rejects cross-origin state changes", () => {
    expect(requestOriginAllowed(new Request("https://fin.example/api/income", { headers: { origin: "https://fin.example" } }), "https://fin.example")).toBe(true);
    expect(requestOriginAllowed(new Request("https://fin.example/api/income", { headers: { origin: "https://evil.example" } }), "https://fin.example")).toBe(false);
    expect(requestOriginAllowed(new Request("https://fin.example/api/income"), "https://fin.example")).toBe(true);
  });

  it("sets browser security headers", () => {
    const headers = securityHeaders(new Headers());
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });
});
