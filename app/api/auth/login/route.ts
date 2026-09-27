import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/domains/identity-access/services/auth-service";
import { setSessionCookie } from "@/platform/auth/session-cookie";
import { handleApiError } from "@/platform/observability/api-error-handler";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * `x-forwarded-for` can be a comma-separated chain appended to by every
 * proxy the request passed through (`client, proxy1, proxy2, ...`) — only
 * the FIRST entry is the original client. Taking the raw header value
 * un-split (the previous behaviour) meant every request through a
 * multi-hop proxy chain got a distinct, ever-growing rate-limit key, which
 * defeats per-IP limiting entirely. Falls back to a fixed key when the
 * header is absent (e.g. direct connections in dev), so all such requests
 * share one bucket rather than each bypassing the limit with an "unknown" IP.
 */
function clientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await request.json());
    const ip = clientIp(request);
    const { token, user } = await authService.login(body.email, body.password, ip);

    const response = NextResponse.json({ user });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
