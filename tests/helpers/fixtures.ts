import { randomUUID } from "node:crypto";
import { organisationRepository } from "@/domains/property/repositories/organisation-repository";
import { propertyRepository } from "@/domains/property/repositories/property-repository";
import { buildingRepository } from "@/domains/inventory/repositories/building-repository";
import { unitTypeRepository } from "@/domains/inventory/repositories/unit-type-repository";
import { unitRepository } from "@/domains/inventory/repositories/unit-repository";
import { inventoryService } from "@/domains/inventory/services/inventory-service";
import { db } from "@/platform/db/client";

/**
 * Every test gets a freshly created organisation/property/building, so
 * tests never share unit rows and can run without needing to truncate
 * tables between them — the EXCLUDE constraint is scoped per unit_id, and
 * every fixture call mints brand-new unit ids.
 */
export async function createOrgAndProperty() {
  const suffix = randomUUID().slice(0, 8);
  const org = await organisationRepository.create(db, {
    name: `Test Resort ${suffix}`,
    slug: `test-resort-${suffix}`,
  });
  const property = await propertyRepository.create(db, {
    organisationId: org.id,
    name: `Test Property ${suffix}`,
    slug: `test-property-${suffix}`,
  });
  return { org, property };
}

/** Creates one linked-inventory cottage: a parent "Cottage" unit + Bedroom A + Bedroom B. */
export async function createLinkedCottageFixture(options?: { allowSeparateSale?: boolean }) {
  const { org, property } = await createOrgAndProperty();
  const building = await buildingRepository.create(db, { propertyId: property.id, name: "Test Building" });
  const cottageType = await unitTypeRepository.create(db, {
    propertyId: property.id,
    name: "2BHK Cottage",
    maxOccupancy: 4,
  });
  const bedroomType = await unitTypeRepository.create(db, {
    propertyId: property.id,
    name: "Standard Bedroom",
    maxOccupancy: 2,
  });

  const { group, cottageUnit, bedroomUnits } = await inventoryService.createLinkedCottage({
    propertyId: property.id,
    buildingId: building.id,
    cottageUnitTypeId: cottageType.id,
    bedroomUnitTypeId: bedroomType.id,
    cottageName: "Cottage",
    bedroomNames: ["Bedroom A", "Bedroom B"],
    allowSeparateSale: options?.allowSeparateSale ?? true,
  });

  return {
    org,
    property,
    building,
    group,
    cottageUnit,
    bedroomA: bedroomUnits[0]!,
    bedroomB: bedroomUnits[1]!,
  };
}

/** Creates a single standalone unit with no linked-inventory group. */
export async function createStandaloneUnitFixture() {
  const { org, property } = await createOrgAndProperty();
  const building = await buildingRepository.create(db, { propertyId: property.id, name: "Test Building" });
  const unitType = await unitTypeRepository.create(db, {
    propertyId: property.id,
    name: "Standard Room",
    maxOccupancy: 2,
  });
  const unit = await unitRepository.create(db, {
    propertyId: property.id,
    buildingId: building.id,
    unitTypeId: unitType.id,
    name: "Room 101",
  });
  return { org, property, building, unit };
}
