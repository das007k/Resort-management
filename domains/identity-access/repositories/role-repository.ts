import { and, eq } from "drizzle-orm";
import { permissions, rolePermissions, roles, userPropertyAccess } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";

export const roleRepository = {
  async findByName(executor: DbExecutor, organisationId: string, name: string) {
    const [row] = await executor
      .select()
      .from(roles)
      .where(and(eq(roles.organisationId, organisationId), eq(roles.name, name)))
      .limit(1);
    return row ?? null;
  },

  async findById(executor: DbExecutor, id: string) {
    const [row] = await executor.select().from(roles).where(eq(roles.id, id)).limit(1);
    return row ?? null;
  },

  async create(
    executor: DbExecutor,
    input: { organisationId: string; name: string; description?: string; isSystemRole?: boolean },
  ) {
    const [row] = await executor
      .insert(roles)
      .values({
        organisationId: input.organisationId,
        name: input.name,
        description: input.description ?? null,
        isSystemRole: input.isSystemRole ?? false,
      })
      .returning();
    return row!;
  },

  async grantPermission(executor: DbExecutor, roleId: string, permissionId: string) {
    await executor.insert(rolePermissions).values({ roleId, permissionId }).onConflictDoNothing();
  },

  async findPermissionByKey(executor: DbExecutor, key: string) {
    const [row] = await executor.select().from(permissions).where(eq(permissions.key, key)).limit(1);
    return row ?? null;
  },

  async upsertPermission(executor: DbExecutor, key: string, description: string) {
    const existing = await this.findPermissionByKey(executor, key);
    if (existing) return existing;
    const [row] = await executor.insert(permissions).values({ key, description }).returning();
    return row!;
  },

  /** All permission keys granted to a role. */
  async permissionKeysForRole(executor: DbExecutor, roleId: string): Promise<string[]> {
    const rows = await executor
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    return rows.map((r) => r.key);
  },

  /**
   * Low-level insert. Callers MUST have already verified that `userId`,
   * `propertyId`, and `roleId` all belong to `organisationId` — this
   * function does not check (it's a thin repository, not the business
   * rule) — see rbacService.grantPropertyRole for the validated entry
   * point. The database's composite foreign keys on user_property_access
   * are the last-resort backstop if a caller skips that validation, but
   * they fail with a raw FK-violation error rather than a clean one.
   */
  async grantUserPropertyRole(
    executor: DbExecutor,
    input: { organisationId: string; userId: string; propertyId: string; roleId: string },
  ) {
    const [row] = await executor
      .insert(userPropertyAccess)
      .values(input)
      .onConflictDoUpdate({
        target: [userPropertyAccess.userId, userPropertyAccess.propertyId],
        set: { roleId: input.roleId },
      })
      .returning();
    return row!;
  },

  async findUserAccessForProperty(executor: DbExecutor, userId: string, propertyId: string) {
    const [row] = await executor
      .select()
      .from(userPropertyAccess)
      .where(and(eq(userPropertyAccess.userId, userId), eq(userPropertyAccess.propertyId, propertyId)))
      .limit(1);
    return row ?? null;
  },
};
