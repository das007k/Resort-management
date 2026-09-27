import { db } from "@/platform/db/client";
import { roleRepository } from "@/domains/identity-access/repositories/role-repository";
import { userRepository } from "@/domains/identity-access/repositories/user-repository";
import { propertyRepository } from "@/domains/property/repositories/property-repository";
import { ForbiddenError, NotFoundError, ValidationError } from "@/platform/observability/errors";
import type { PermissionKey } from "@/domains/identity-access/rules/permission-catalog";

export const rbacService = {
  /** All permission keys the given user holds for the given property. */
  async permissionsForUserOnProperty(userId: string, propertyId: string): Promise<Set<string>> {
    const access = await roleRepository.findUserAccessForProperty(db, userId, propertyId);
    if (!access) return new Set();
    const keys = await roleRepository.permissionKeysForRole(db, access.roleId);
    return new Set(keys);
  },

  async hasPermission(userId: string, propertyId: string, permission: PermissionKey): Promise<boolean> {
    const granted = await this.permissionsForUserOnProperty(userId, propertyId);
    return granted.has(permission);
  },

  /** Throws ForbiddenError if the user lacks the permission — for use at the top of a service method. */
  async assertPermission(userId: string, propertyId: string, permission: PermissionKey): Promise<void> {
    const allowed = await this.hasPermission(userId, propertyId, permission);
    if (!allowed) throw new ForbiddenError(permission);
  },

  /**
   * The validated entry point for granting a user a role on a property.
   * Verifies the user, property, and role all belong to the SAME
   * organisation before writing anything — without this, a caller could
   * grant a Property A (org X) user a Role defined in org Y, which would
   * silently corrupt property-scoped RBAC (permissionsForUserOnProperty
   * would resolve permissions from a role that has no business governing
   * that property). The database's composite foreign keys on
   * user_property_access enforce the same rule as a backstop, but this
   * check gives a clean, actionable ValidationError instead of a raw
   * constraint-violation error.
   */
  async grantPropertyRole(input: { userId: string; propertyId: string; roleId: string }) {
    const [user, property, role] = await Promise.all([
      userRepository.findById(db, input.userId),
      propertyRepository.findById(db, input.propertyId),
      roleRepository.findById(db, input.roleId),
    ]);
    if (!user) throw new NotFoundError("User", input.userId);
    if (!property) throw new NotFoundError("Property", input.propertyId);
    if (!role) throw new NotFoundError("Role", input.roleId);

    if (user.organisationId !== property.organisationId || property.organisationId !== role.organisationId) {
      throw new ValidationError("User, property, and role must all belong to the same organisation", {
        userOrganisationId: user.organisationId,
        propertyOrganisationId: property.organisationId,
        roleOrganisationId: role.organisationId,
      });
    }

    return roleRepository.grantUserPropertyRole(db, {
      organisationId: property.organisationId,
      userId: input.userId,
      propertyId: input.propertyId,
      roleId: input.roleId,
    });
  },
};
