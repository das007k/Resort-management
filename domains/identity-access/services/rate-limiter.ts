/**
 * Simple in-memory sliding-window rate limiter for sensitive endpoints
 * (login, password reset). Single-process only — adequate for Phase 1, but
 * MUST move to a shared store (Redis) before running more than one app
 * instance in production. Tracked as a known limitation in the Phase 1 report.
 */
const attempts = new Map<string, number[]>();

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const existing = (attempts.get(key) ?? []).filter((ts) => ts > windowStart);
  if (existing.length >= maxAttempts) {
    attempts.set(key, existing);
    return false; // rate-limited
  }
  existing.push(now);
  attempts.set(key, existing);
  return true; // allowed
}
