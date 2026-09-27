import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/platform/config/env";
import type { SessionClaims } from "@/domains/identity-access/entities/user";

function secretKey() {
  const env = getEnv();
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export const sessionService = {
  async issue(claims: SessionClaims): Promise<string> {
    const env = getEnv();
    return new SignJWT({ organisationId: claims.organisationId, email: claims.email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(claims.sub)
      .setIssuedAt()
      .setExpirationTime(`${env.AUTH_SESSION_TTL_SECONDS}s`)
      .sign(secretKey());
  },

  /** Returns the verified claims, or null if the token is missing/invalid/expired. */
  async verify(token: string | undefined | null): Promise<SessionClaims | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, secretKey());
      if (!payload.sub || typeof payload.organisationId !== "string" || typeof payload.email !== "string") {
        return null;
      }
      return { sub: payload.sub, organisationId: payload.organisationId, email: payload.email };
    } catch {
      // Expired, tampered, or malformed — treat uniformly as "not authenticated".
      return null;
    }
  },
};
