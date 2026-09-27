import type { reservations } from "@/platform/db/schema";

export interface CreateBookingInput {
  propertyId: string;
  unitId: string; // the unit the guest actually occupies
  checkIn: string; // ISO date "YYYY-MM-DD"
  checkOut: string; // ISO date "YYYY-MM-DD", exclusive
  source: "MANUAL" | "DIRECT" | "OTA" | "WALK_IN";
  status?: "TENTATIVE" | "CONFIRMED";
  externalReference?: string;
  idempotencyKey?: string;
  actorUserId?: string;
}

export type Reservation = typeof reservations.$inferSelect;

export interface CreateBookingResult {
  reservation: Reservation;
  blockedUnitIds: string[];
  replayed: boolean; // true if this call returned an EXISTING reservation via idempotency replay
}
