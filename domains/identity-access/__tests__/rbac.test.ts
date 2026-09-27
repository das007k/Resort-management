import { describe, it, expect } from "vitest";
import { db } from "@/platform/db/client";
import { roleRepository } from "@/domains/identity-access/repositories/role-repository";
import { userRepository } from "@/domains/identity-access/repositories/user-repository";
import { rbacService } from "@/domains/identity-access/services/rbac-service";
import { passwordService } from "@/domains/identity-access/services/password-service";
import { PERMISSIONS } from "@/domains/identity-access/rules/permission-catalog";
import { ValidationError } from "@/platform/observability/errors";
import { createOrgAndProperty } from "@/tests/helpers/fixtures";

// Mandatory principle §17: automated coverage for role permissions.

describe("RBAC — property-scoped permission checks", () => {
  it("grants only the permissions bundled into the assigned role", async () => {
    const { org, property } = await createOrgAndProperty();

    const permission = await roleRepository.upsertPermission(db, PERMISSIONS.RATE_OVERRIDE, "Override a rate");
    await roleRepository.upsertPermission(db, PERMISSIONS.REFUND_APPROVE, "Approve a refund");

    const revenueRole = await roleRepository.create(db, {
      organisationId: org.id,
      name: "Revenue Manager",
      description: "Rate management",
    });
    await roleRepository.grantPermission(db, revenueRole.id, permission.id);

    const user = await userRepository.create(db, {
      organisationId: org.id,
      email: `rbac-${property.id}@example.com`,
      passwordHash: await passwordService.hash("irrelevant"),
      fullName: "Test Revenue Manager",
    });

    await rbacService.grantPropertyRole({ userId: user.id, propertyId: property.id, roleId: revenueRole.id });

    await expect(rbacService.hasPermission(user.id, property.id, PERMISSIONS.RATE_OVERRIDE)).resolves.toBe(true);
    await expect(rbacService.hasPermission(user.id, property.id, PERMISSIONS.REFUND_APPROVE)).resolves.toBe(false);
  });

  it("a user with no role grant on a property has no permissions there", async () => {
    const { org, property } = await createOrgAndProperty();
    const user = await userRepository.create(db, {
      organisationId: org.id,
      email: `no-access-${property.id}@example.com`,
      passwordHash: await passwordService.hash("irrelevant"),
      fullName: "No Access User",
    });

    await expect(rbacService.hasPermission(user.id, property.id, PERMISSIONS.RATE_OVERRIDE)).resolves.toBe(false);
  });

  it("assertPermission throws ForbiddenError when the permission is missing", async () => {
    const { org, property } = await createOrgAndProperty();
    const user = await userRepository.create(db, {
      organisationId: org.id,
      email: `forbidden-${property.id}@example.com`,
      passwordHash: await passwordService.hash("irrelevant"),
      fullName: "Forbidden User",
    });

    await expect(rbacService.assertPermission(user.id, property.id, PERMISSIONS.USER_ADMINISTER)).rejects.toThrow();
  });

  // Review fix (task #16): grantPropertyRole must reject a grant whose
  // user, property, and role don't all belong to the same organisation —
  // otherwise property-scoped RBAC could resolve permissions from a role
  // that has no business governing that property.
  it("rejects granting a role when the user, property, and role span different organisations", async () => {
    const { org: orgA, property: propertyA } = await createOrgAndProperty();
    const { org: orgB } = await createOrgAndProperty();

    const userInOrgA = await userRepository.create(db, {
      organisationId: orgA.id,
      email: `cross-org-${propertyA.id}@example.com`,
      passwordHash: await passwordService.hash("irrelevant"),
      fullName: "Cross Org User",
    });

    const roleInOrgB = await roleRepository.create(db, {
      organisationId: orgB.id,
      name: "Cross-Org Role",
    });

    // userInOrgA + propertyA (org A) + roleInOrgB (org B): three different
    // organisations disagree, so this must be rejected before anything is written.
    await expect(
      rbacService.grantPropertyRole({ userId: userInOrgA.id, propertyId: propertyA.id, roleId: roleInOrgB.id }),
    ).rejects.toBeInstanceOf(ValidationError);

    const access = await roleRepository.findUserAccessForProperty(db, userInOrgA.id, propertyA.id);
    expect(access).toBeNull();
  });
});
