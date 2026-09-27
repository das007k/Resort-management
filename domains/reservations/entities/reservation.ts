export interface CreateReservationRecordInput {
  propertyId: string;
  status: "TENTATIVE" | "CONFIRMED";
  source: "MANUAL" | "DIRECT" | "OTA" | "WALK_IN";
  externalReference?: string;
  idempotencyKey?: string;
  checkIn: string;
  checkOut: string;
  createdBy?: string;
}

export interface CreateReservationUnitInput {
  propertyId: string;
  reservationId: string;
  unitId: string;
  blockType: "OCCUPIED" | "LINKED_BLOCK";
  checkIn: string;
  checkOut: string;
}
