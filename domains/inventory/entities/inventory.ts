export interface CreateBuildingInput {
  propertyId: string;
  name: string;
}

export interface CreateUnitTypeInput {
  propertyId: string;
  name: string;
  maxOccupancy: number;
}

export interface CreateUnitInput {
  propertyId: string;
  buildingId: string;
  unitTypeId: string;
  name: string;
}

/**
 * Creates one physical cottage's full linked-inventory configuration in a
 * single call: the whole-cottage sellable unit, plus N separately-sellable
 * bedroom units, all tied together in one LinkedInventoryGroup.
 */
export interface CreateLinkedCottageInput {
  propertyId: string;
  buildingId: string;
  cottageUnitTypeId: string;
  bedroomUnitTypeId: string;
  cottageName: string; // e.g. "Cottage 3"
  bedroomNames: string[]; // e.g. ["Cottage 3 - Bedroom A", "Cottage 3 - Bedroom B"]
  allowSeparateSale?: boolean;
  actorUserId?: string;
}
