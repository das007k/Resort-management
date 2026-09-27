import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/platform/config/env";

/**
 * Defense-in-depth route guard: redirects unauthenticated requests away
 * from protected app routes before they even render. This checks only for
 * the PRESENCE of a session cookie (middleware runs on the Edge runtime,
 * where verifying the JWT would require re-importing `jose` there too) —
 * the actual signature/expiry verification happens in `requireUser` /
 * `authService.currentUserFromToken` on every page and API route. This is
 * a UX redirect, not the security boundary.
 */
const PROTECTED_PREFIXES = ["/dashboard"];

export function proxy(request: NextRequest) {
  const env = getEnv();
  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const hasSessionCookie = request.cookies.has(env.AUTH_SESSION_COOKIE_NAME);
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
