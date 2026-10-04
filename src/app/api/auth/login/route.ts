import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME, configuredAuthToken, matchesAuthToken } from "@/lib/security/requestSecurity";

const schema = z.object({ token: z.string().min(1).max(512) }).strict();

export async function POST(request: NextRequest) {
  try {
    const expected = configuredAuthToken();
    const { token } = schema.parse(await request.json());
    if (!expected || !matchesAuthToken(token, expected)) return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    const response = NextResponse.json({ status: "authenticated" });
    response.cookies.set(AUTH_COOKIE_NAME, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch { return NextResponse.json({ message: "Invalid credentials" }, { status: 401 }); }
}

export async function DELETE() {
  const response = NextResponse.json({ status: "signed_out" });
  response.cookies.set(AUTH_COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
