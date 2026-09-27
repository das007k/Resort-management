import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { db } from "@/platform/db/client";
import { userRepository } from "@/domains/identity-access/repositories/user-repository";
import { passwordService } from "@/domains/identity-access/services/password-service";
import { authService } from "@/domains/identity-access/services/auth-service";
import { sessionService } from "@/domains/identity-access/services/session-service";
import { createOrgAndProperty } from "@/tests/helpers/fixtures";

describe("auth service", () => {
  it("issues a valid session on correct credentials, and never stores the plaintext password", async () => {
    const { org } = await createOrgAndProperty();
    const email = `login-${org.id}@example.com`;
    const plainPassword = "Sup3rSecret!";

    const user = await userRepository.create(db, {
      organisationId: org.id,
      email,
      passwordHash: await passwordService.hash(plainPassword),
      fullName: "Login Test User",
    });

    expect(user.passwordHash).not.toBe(plainPassword);

    const { token, user: loggedInUser } = await authService.login(email, plainPassword, "test-rate-limit-key-1");
    expect(loggedInUser.email).toBe(email);

    const claims = await sessionService.verify(token);
    expect(claims?.sub).toBe(user.id);

    const resolved = await authService.currentUserFromToken(token);
    expect(resolved?.id).toBe(user.id);
  });

  it("rejects an incorrect password without revealing whether the email exists", async () => {
    const { org } = await createOrgAndProperty();
    const email = `wrong-pw-${org.id}@example.com`;
    await userRepository.create(db, {
      organisationId: org.id,
      email,
      passwordHash: await passwordService.hash("correct-password"),
      fullName: "Wrong Password Test",
    });

    const wrongPasswordAttempt = authService.login(email, "incorrect-password", "test-rate-limit-key-2");
    const unknownEmailAttempt = authService.login("no-such-user@example.com", "whatever", "test-rate-limit-key-3");

    await expect(wrongPasswordAttempt).rejects.toThrow("Invalid email or password");
    await expect(unknownEmailAttempt).rejects.toThrow("Invalid email or password");
  });

  it("rejects a tampered or malformed session token", async () => {
    const claims = await sessionService.verify("not-a-real-token");
    expect(claims).toBeNull();
  });

  // Review fix (bug #15): email used to be unique only WITHIN an
  // organisation, so two different organisations could each register a user
  // with the same email and login (which takes no organisation selector)
  // would be ambiguous about which account to authenticate. Email is now
  // globally unique (migration 0003), which the database itself enforces.
  it("rejects creating a second user with the same email in a DIFFERENT organisation", async () => {
    const { org: orgA } = await createOrgAndProperty();
    const { org: orgB } = await createOrgAndProperty();
    const sharedEmail = `shared-${orgA.id}@example.com`;

    await userRepository.create(db, {
      organisationId: orgA.id,
      email: sharedEmail,
      passwordHash: await passwordService.hash("password-one"),
      fullName: "Org A User",
    });

    await expect(
      userRepository.create(db, {
        organisationId: orgB.id,
        email: sharedEmail,
        passwordHash: await passwordService.hash("password-two"),
        fullName: "Org B User",
      }),
    ).rejects.toThrow();
  });

  // Review fix (bug #17): login used to rate-limit on a single combined
  // `${ip}:${email}` key, so varying either half reset the bucket — an
  // attacker could spray one password across many emails from one IP, or
  // retry one email from many IPs, and never trip the limit. Email and IP
  // are now independent buckets; either one alone can block a request.
  it("rate-limits by email independently of IP: the same email from many different IPs still gets blocked", async () => {
    const email = `rate-limit-email-${randomUUID()}@example.com`;

    // The email-bucket limit is 10 attempts / 15 min (see auth-service.ts).
    // Each of these uses a distinct IP, so if IP were still part of a
    // combined key, none of these would ever trip the limit.
    for (let i = 0; i < 10; i++) {
      await expect(authService.login(email, "whatever", `10.0.0.${i}`)).rejects.toThrow("Invalid email or password");
    }

    // The 11th attempt, from yet another new IP, must still be blocked —
    // proving the block is keyed on email, not on IP.
    await expect(authService.login(email, "whatever", "10.0.0.99")).rejects.toThrow("Too many login attempts");
  });

  it("rate-limits by IP independently of email: many different emails from the same IP still get blocked", async () => {
    const ip = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;

    // The IP-bucket limit is 30 attempts / 15 min (see auth-service.ts).
    // Each of these uses a distinct, nonexistent email, so if email were
    // still part of a combined key, none of these would ever trip the limit.
    for (let i = 0; i < 30; i++) {
      await expect(authService.login(`rate-limit-ip-${randomUUID()}@example.com`, "whatever", ip)).rejects.toThrow(
        "Invalid email or password",
      );
    }

    // The 31st attempt, with yet another new email, must still be blocked —
    // proving the block is keyed on IP, not on email.
    await expect(
      authService.login(`rate-limit-ip-${randomUUID()}@example.com`, "whatever", ip),
    ).rejects.toThrow("Too many login attempts");
  });
});
