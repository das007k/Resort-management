import type { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/platform/config/env";

export function setSessionCookie(response: NextResponse, token: string) {
  const env = getEnv();
  response.cookies.set(env.AUTH_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.AUTH_SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  const env = getEnv();
  response.cookies.set(env.AUTH_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionTokenFromRequest(request: NextRequest): string | undefined {
  const env = getEnv();
  return request.cookies.get(env.AUTH_SESSION_COOKIE_NAME)?.value;
}
