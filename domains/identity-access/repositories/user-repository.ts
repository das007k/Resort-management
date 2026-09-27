import { eq, and } from "drizzle-orm";
import { users } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";

export const userRepository = {
  /**
   * Looks up a user by email. Email is globally unique across the whole
   * platform (see migration 0003 / the `users_email_uq` index) specifically
   * so this lookup is unambiguous — the login endpoint has no organisation
   * selector, so "which user does this email belong to" must have exactly
   * one answer. This is the method login uses.
   */
  async findByEmail(executor: DbExecutor, email: string) {
    const [row] = await executor.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return row ?? null;
  },

  /** Looks up a user by email scoped to one organisation — used when the
   * caller already knows (and wants to enforce) the organisation, e.g.
   * seeding or an org-scoped admin lookup. Since email is globally unique,
   * a hit here is also the only possible global hit; this just additionally
   * asserts the organisation matches. */
  async findByEmailInOrg(executor: DbExecutor, organisationId: string, email: string) {
    const [row] = await executor
      .select()
      .from(users)
      .where(and(eq(users.organisationId, organisationId), eq(users.email, email.toLowerCase())))
      .limit(1);
    return row ?? null;
  },

  async findById(executor: DbExecutor, id: string) {
    const [row] = await executor.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  },

  async create(
    executor: DbExecutor,
    input: { organisationId: string; email: string; passwordHash: string; fullName: string; createdBy?: string },
  ) {
    const [row] = await executor
      .insert(users)
      .values({
        organisationId: input.organisationId,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
      })
      .returning();
    return row!;
  },
};
