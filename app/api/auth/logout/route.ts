import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/platform/auth/session-cookie";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
