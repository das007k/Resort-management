import { describe, it, expect } from "vitest";
import { db } from "@/platform/db/client";
import { inventoryService } from "@/domains/inventory/services/inventory-service";
import { buildingRepository } from "@/domains/inventory/repositories/building-repository";
import { unitTypeRepository } from "@/domains/inventory/repositories/unit-type-repository";
import { ValidationError } from "@/platform/observability/errors";
import { createOrgAndProperty } from "@/tests/helpers/fixtures";

// Review fix (task #16): a unit's building and unit type must belong to the
// SAME property as the unit itself. Before this fix, nothing stopped a
// caller from passing a building or unit type id that actually belongs to a
// different property — units.propertyId, units.buildingId, and
// units.unitTypeId were only independently validated to exist, never
// validated to be mutually consistent.

describe("inventory service — cross-property consistency", () => {
  it("createUnit rejects a building that belongs to a different property", async () => {
    const { property: propertyA } = await createOrgAndProperty();
    const { property: propertyB } = await createOrgAndProperty();

    const buildingInB = await buildingRepository.create(db, { propertyId: propertyB.id, name: "Building in B" });
    const unitTypeInA = await unitTypeRepository.create(db, {
      propertyId: propertyA.id,
      name: "Standard Room",
      maxOccupancy: 2,
    });

    await expect(
      inventoryService.createUnit({
        propertyId: propertyA.id,
        buildingId: buildingInB.id, // wrong property
        unitTypeId: unitTypeInA.id,
        name: "Cross-Property Unit",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("createUnit rejects a unit type that belongs to a different property", async () => {
    const { property: propertyA } = await createOrgAndProperty();
    const { property: propertyB } = await createOrgAndProperty();

    const buildingInA = await buildingRepository.create(db, { propertyId: propertyA.id, name: "Building in A" });
    const unitTypeInB = await unitTypeRepository.create(db, {
      propertyId: propertyB.id,
      name: "Standard Room",
      maxOccupancy: 2,
    });

    await expect(
      inventoryService.createUnit({
        propertyId: propertyA.id,
        buildingId: buildingInA.id,
        unitTypeId: unitTypeInB.id, // wrong property
        name: "Cross-Property Unit",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("createLinkedCottage rejects a building that belongs to a different property", async () => {
    const { property: propertyA } = await createOrgAndProperty();
    const { property: propertyB } = await createOrgAndProperty();

    const buildingInB = await buildingRepository.create(db, { propertyId: propertyB.id, name: "Building in B" });
    const cottageType = await unitTypeRepository.create(db, {
      propertyId: propertyA.id,
      name: "2BHK Cottage",
      maxOccupancy: 4,
    });
    const bedroomType = await unitTypeRepository.create(db, {
      propertyId: propertyA.id,
      name: "Standard Bedroom",
      maxOccupancy: 2,
    });

    await expect(
      inventoryService.createLinkedCottage({
        propertyId: propertyA.id,
        buildingId: buildingInB.id, // wrong property
        cottageUnitTypeId: cottageType.id,
        bedroomUnitTypeId: bedroomType.id,
        cottageName: "Cottage X",
        bedroomNames: ["Bedroom A", "Bedroom B"],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
