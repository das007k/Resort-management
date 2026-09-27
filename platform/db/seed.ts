/**
 * Development seed script — NOT run automatically against staging/production.
 * Creates: Cardamom Rock Resort org + property, the full permission catalog,
 * the standard role set (mandatory principle §14), an Owner user, one
 * building, unit types, and one linked-inventory cottage (Cottage 1 with
 * Bedroom A / Bedroom B) so the app is immediately explorable after
 * `npm run db:migrate && npm run db:seed`.
 */
import "dotenv/config";
import { db, pool } from "@/platform/db/client";
import { organisationRepository } from "@/domains/property/repositories/organisation-repository";
import { propertyRepository } from "@/domains/property/repositories/property-repository";
import { roleRepository } from "@/domains/identity-access/repositories/role-repository";
import { userRepository } from "@/domains/identity-access/repositories/user-repository";
import { passwordService } from "@/domains/identity-access/services/password-service";
import { rbacService } from "@/domains/identity-access/services/rbac-service";
import { buildingRepository } from "@/domains/inventory/repositories/building-repository";
import { unitTypeRepository } from "@/domains/inventory/repositories/unit-type-repository";
import { unitRepository } from "@/domains/inventory/repositories/unit-repository";
import { inventoryService } from "@/domains/inventory/services/inventory-service";
import { PERMISSION_CATALOG, DEFAULT_ROLES } from "@/domains/identity-access/rules/permission-catalog";

async function main() {
  console.log("Seeding StayAxis development data...");

  let org = await organisationRepository.findBySlug(db, "cardamom-rock-resort");
  if (!org) {
    org = await organisationRepository.create(db, { name: "Cardamom Rock Resort", slug: "cardamom-rock-resort" });
  }
  console.log(`Organisation: ${org.name} (${org.id})`);

  let property = await propertyRepository.findBySlug(db, org.id, "cardamom-rock-resort");
  if (!property) {
    property = await propertyRepository.create(db, {
      organisationId: org.id,
      name: "Cardamom Rock Resort",
      slug: "cardamom-rock-resort",
      timezone: "Asia/Kolkata",
      currency: "INR",
    });
  }
  console.log(`Property: ${property.name} (${property.id})`);

  // --- Permission catalog -----------------------------------------------
  const permissionIdByKey = new Map<string, string>();
  for (const p of PERMISSION_CATALOG) {
    const row = await roleRepository.upsertPermission(db, p.key, p.description);
    permissionIdByKey.set(p.key, row.id);
  }
  console.log(`Permissions: ${permissionIdByKey.size} upserted`);

  // --- Roles ---------------------------------------------------------------
  const roleIdByName = new Map<string, string>();
  for (const [roleName, def] of Object.entries(DEFAULT_ROLES)) {
    let role = await roleRepository.findByName(db, org.id, roleName);
    if (!role) {
      role = await roleRepository.create(db, {
        organisationId: org.id,
        name: roleName,
        description: def.description,
        isSystemRole: true,
      });
    }
    roleIdByName.set(roleName, role.id);
    for (const permKey of def.permissions) {
      const permId = permissionIdByKey.get(permKey);
      if (permId) await roleRepository.grantPermission(db, role.id, permId);
    }
  }
  console.log(`Roles: ${roleIdByName.size} upserted`);

  // --- Owner user ------------------------------------------------------
  const ownerEmail = "owner@cardamomrock.example";
  let owner = await userRepository.findByEmailInOrg(db, org.id, ownerEmail);
  if (!owner) {
    owner = await userRepository.create(db, {
      organisationId: org.id,
      email: ownerEmail,
      passwordHash: await passwordService.hash("ChangeMe123!"),
      fullName: "Resort Owner",
    });
  }
  const ownerRoleId = roleIdByName.get("Owner")!;
  await rbacService.grantPropertyRole({ userId: owner.id, propertyId: property.id, roleId: ownerRoleId });
  console.log(`Owner user: ${owner.email} (password: ChangeMe123! — change immediately outside dev)`);

  // --- Inventory: one building, two unit types, one linked cottage ------
  const buildings = await buildingRepository.listForProperty(db, property.id);
  let building = buildings[0];
  if (!building) {
    building = await buildingRepository.create(db, { propertyId: property.id, name: "Hillside Block" });
  }

  const unitTypes = await unitTypeRepository.listForProperty(db, property.id);
  let cottageType = unitTypes.find((t) => t.name === "2BHK Cottage");
  if (!cottageType) {
    cottageType = await unitTypeRepository.create(db, { propertyId: property.id, name: "2BHK Cottage", maxOccupancy: 4 });
  }
  let bedroomType = unitTypes.find((t) => t.name === "Standard Bedroom");
  if (!bedroomType) {
    bedroomType = await unitTypeRepository.create(db, { propertyId: property.id, name: "Standard Bedroom", maxOccupancy: 2 });
  }

  const existingUnits = await unitRepository.listForProperty(db, property.id);
  const cottageAlreadySeeded = existingUnits.some((u) => u.name === "Cottage 1");
  if (!cottageAlreadySeeded) {
    const { group, cottageUnit, bedroomUnits } = await inventoryService.createLinkedCottage({
      propertyId: property.id,
      buildingId: building.id,
      cottageUnitTypeId: cottageType.id,
      bedroomUnitTypeId: bedroomType.id,
      cottageName: "Cottage 1",
      bedroomNames: ["Cottage 1 - Bedroom A", "Cottage 1 - Bedroom B"],
      allowSeparateSale: true,
      actorUserId: owner.id,
    });
    console.log(
      `Linked cottage: ${cottageUnit.name} (${cottageUnit.id}) + ${bedroomUnits.map((b) => b.name).join(", ")} in group ${group.id}`,
    );
  } else {
    console.log("Linked cottage already seeded — skipping.");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
