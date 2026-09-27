import { db } from "@/platform/db/client";
import { buildingRepository } from "@/domains/inventory/repositories/building-repository";
import { unitTypeRepository } from "@/domains/inventory/repositories/unit-type-repository";
import { unitRepository } from "@/domains/inventory/repositories/unit-repository";
import { linkedInventoryRepository } from "@/domains/inventory/repositories/linked-inventory-repository";
import { auditService } from "@/domains/audit/services/audit-service";
import { propertyRepository } from "@/domains/property/repositories/property-repository";
import { NotFoundError, ValidationError } from "@/platform/observability/errors";
import type {
  CreateBuildingInput,
  CreateUnitTypeInput,
  CreateUnitInput,
  CreateLinkedCottageInput,
} from "@/domains/inventory/entities/inventory";

async function organisationIdForProperty(propertyId: string): Promise<string> {
  const property = await propertyRepository.findById(db, propertyId);
  if (!property) throw new NotFoundError("Property", propertyId);
  return property.organisationId;
}

/**
 * Verifies `buildingId` and `unitTypeId` actually belong to `propertyId`
 * before a unit is created. Without this, nothing stops a caller from
 * passing a building or unit type id from a DIFFERENT property — the
 * single-column foreign keys on `units` only check that the ids exist
 * somewhere, not that they're consistent with each other. The database's
 * composite foreign keys (units_property_building_fk /
 * units_property_unit_type_fk, see platform/db/schema.ts) enforce the same
 * rule as a hard backstop, but this check gives a clean ValidationError
 * instead of a raw constraint-violation error surfacing from the insert.
 */
async function assertBuildingAndUnitTypeBelongToProperty(
  propertyId: string,
  buildingId: string,
  unitTypeId: string,
): Promise<void> {
  const [building, unitType] = await Promise.all([
    buildingRepository.findById(db, buildingId),
    unitTypeRepository.findById(db, unitTypeId),
  ]);
  if (!building) throw new NotFoundError("Building", buildingId);
  if (!unitType) throw new NotFoundError("UnitType", unitTypeId);

  if (building.propertyId !== propertyId) {
    throw new ValidationError(`Building "${buildingId}" does not belong to property "${propertyId}"`, {
      buildingId,
      buildingPropertyId: building.propertyId,
      propertyId,
    });
  }
  if (unitType.propertyId !== propertyId) {
    throw new ValidationError(`Unit type "${unitTypeId}" does not belong to property "${propertyId}"`, {
      unitTypeId,
      unitTypePropertyId: unitType.propertyId,
      propertyId,
    });
  }
}

export const inventoryService = {
  async createBuilding(input: CreateBuildingInput) {
    return buildingRepository.create(db, input);
  },

  async createUnitType(input: CreateUnitTypeInput) {
    return unitTypeRepository.create(db, input);
  },

  async createUnit(input: CreateUnitInput) {
    await assertBuildingAndUnitTypeBelongToProperty(input.propertyId, input.buildingId, input.unitTypeId);
    return unitRepository.create(db, input);
  },

  /**
   * Sets up the classic linked-inventory scenario in one transaction:
   * one whole-cottage sellable unit + N bedroom units, all linked so the
   * availability service can enforce "booking the cottage blocks every
   * bedroom, and booking any bedroom blocks the cottage" (mandatory
   * principle §6).
   */
  async createLinkedCottage(input: CreateLinkedCottageInput) {
    const organisationId = await organisationIdForProperty(input.propertyId);
    await assertBuildingAndUnitTypeBelongToProperty(input.propertyId, input.buildingId, input.cottageUnitTypeId);
    await assertBuildingAndUnitTypeBelongToProperty(input.propertyId, input.buildingId, input.bedroomUnitTypeId);

    return db.transaction(async (tx) => {
      const cottageUnit = await unitRepository.create(tx, {
        propertyId: input.propertyId,
        buildingId: input.buildingId,
        unitTypeId: input.cottageUnitTypeId,
        name: input.cottageName,
      });

      const bedroomUnits = [];
      for (const name of input.bedroomNames) {
        const bedroom = await unitRepository.create(tx, {
          propertyId: input.propertyId,
          buildingId: input.buildingId,
          unitTypeId: input.bedroomUnitTypeId,
          name,
        });
        bedroomUnits.push(bedroom);
      }

      const group = await linkedInventoryRepository.createGroup(tx, {
        propertyId: input.propertyId,
        name: `${input.cottageName} linked inventory`,
        allowSeparateSale: input.allowSeparateSale ?? true,
      });

      await linkedInventoryRepository.addMember(tx, {
        propertyId: input.propertyId,
        groupId: group.id,
        unitId: cottageUnit.id,
        isParent: true,
      });
      for (const bedroom of bedroomUnits) {
        await linkedInventoryRepository.addMember(tx, {
          propertyId: input.propertyId,
          groupId: group.id,
          unitId: bedroom.id,
          isParent: false,
        });
      }

      await auditService.record(tx, {
        organisationId,
        propertyId: input.propertyId,
        actorUserId: input.actorUserId,
        action: "linked_inventory_group.created",
        entityType: "linked_inventory_group",
        entityId: group.id,
        after: { group, cottageUnit, bedroomUnits },
      });

      return { group, cottageUnit, bedroomUnits };
    });
  },

  async setUnitStatus(unitId: string, status: "AVAILABLE" | "OUT_OF_ORDER" | "INACTIVE", actorUserId?: string) {
    const unit = await unitRepository.findById(db, unitId);
    if (!unit) throw new NotFoundError("Unit", unitId);
    const organisationId = await organisationIdForProperty(unit.propertyId);

    return db.transaction(async (tx) => {
      const before = unit;
      const after = await unitRepository.setStatus(tx, unitId, status);
      await auditService.record(tx, {
        organisationId,
        propertyId: unit.propertyId,
        actorUserId,
        action: "unit.status_changed",
        entityType: "unit",
        entityId: unitId,
        before,
        after,
      });
      return after;
    });
  },
};
