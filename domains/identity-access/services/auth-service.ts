import { db } from "@/platform/db/client";
import { userRepository } from "@/domains/identity-access/repositories/user-repository";
import { passwordService } from "@/domains/identity-access/services/password-service";
import { sessionService } from "@/domains/identity-access/services/session-service";
import { checkRateLimit } from "@/domains/identity-access/services/rate-limiter";
import { AppError, UnauthenticatedError } from "@/platform/observability/errors";
import type { AuthenticatedUser } from "@/domains/identity-access/entities/user";

// Per-email limit: deliberately tighter. This is what actually protects a
// single targeted account from a credential-stuffing / brute-force attempt,
// and must apply regardless of how many different source IPs the attacker
// spreads the attempts across.
const LOGIN_EMAIL_MAX_ATTEMPTS = 10;
const LOGIN_EMAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Per-IP limit: deliberately looser. This catches an attacker spraying
// credentials across many different accounts from one source, without
// punishing a shared office/NAT/CGNAT IP where several genuine users are
// legitimately logging in around the same time.
const LOGIN_IP_MAX_ATTEMPTS = 30;
const LOGIN_IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const authService = {
  /**
   * Verifies credentials and issues a signed session token. Deliberately
   * returns the SAME generic error whether the email doesn't exist or the
   * password is wrong, so the API never discloses which one failed.
   *
   * Email and IP are rate-limited INDEPENDENTLY (two separate buckets, both
   * must pass) rather than combined into one key. A combined `${ip}:${email}`
   * key — the previous approach — gives an attacker an easy bypass: vary
   * either half and you get a fresh bucket, so spraying one password across
   * many emails from one IP, or retrying one email from many IPs/proxies,
   * both evaded the limit entirely.
   */
  async login(email: string, plainTextPassword: string, ip: string): Promise<{ token: string; user: AuthenticatedUser }> {
    const normalizedEmail = email.toLowerCase();

    const emailAllowed = checkRateLimit(`login:email:${normalizedEmail}`, LOGIN_EMAIL_MAX_ATTEMPTS, LOGIN_EMAIL_WINDOW_MS);
    const ipAllowed = checkRateLimit(`login:ip:${ip}`, LOGIN_IP_MAX_ATTEMPTS, LOGIN_IP_WINDOW_MS);
    if (!emailAllowed || !ipAllowed) {
      throw new AppError("FORBIDDEN", "Too many login attempts. Please try again later.");
    }

    // Email is globally unique (migration 0003), so this lookup is
    // tenant-unambiguous: there is exactly one possible account for a given
    // email across the whole platform, never a "which organisation" guess.
    const user = await userRepository.findByEmail(db, normalizedEmail);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthenticatedError("Invalid email or password");
    }

    const valid = await passwordService.verify(plainTextPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthenticatedError("Invalid email or password");
    }

    const token = await sessionService.issue({
      sub: user.id,
      organisationId: user.organisationId,
      email: user.email,
    });

    return {
      token,
      user: { id: user.id, organisationId: user.organisationId, email: user.email, fullName: user.fullName },
    };
  },

  async currentUserFromToken(token: string | undefined | null): Promise<AuthenticatedUser | null> {
    const claims = await sessionService.verify(token);
    if (!claims) return null;
    const user = await userRepository.findById(db, claims.sub);
    if (!user || user.status !== "ACTIVE") return null;
    return { id: user.id, organisationId: user.organisationId, email: user.email, fullName: user.fullName };
  },
};
