import { db } from "@/platform/db/client";
import { unitRepository } from "@/domains/inventory/repositories/unit-repository";
import { reservationRepository } from "@/domains/reservations/repositories/reservation-repository";
import { reservationUnitRepository } from "@/domains/reservations/repositories/reservation-unit-repository";
import { reservationActivityRepository } from "@/domains/reservations/repositories/reservation-activity-repository";
import { propertyRepository } from "@/domains/property/repositories/property-repository";
import { auditService } from "@/domains/audit/services/audit-service";
import { computeBookingSets } from "@/platform/availability-service/blocking-set";
import { AvailabilityConflictError, NotFoundError, ValidationError } from "@/platform/observability/errors";
import { logger } from "@/platform/observability/logger";
import type { DbExecutor } from "@/platform/db/types";
import type { CreateBookingInput, CreateBookingResult } from "@/platform/availability-service/entities";

const PG_EXCLUSION_VIOLATION = "23P01";
const PG_UNIQUE_VIOLATION = "23505";

function pgErrorCode(error: unknown): string | undefined {
  return (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
}

function isExclusionViolation(error: unknown): boolean {
  return pgErrorCode(error) === PG_EXCLUSION_VIOLATION;
}

function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === PG_UNIQUE_VIOLATION;
}

/**
 * Looks up an existing reservation by idempotency key and shapes it as a
 * replay result. Returns null if no such reservation exists yet.
 */
async function findIdempotentReplay(
  executor: DbExecutor,
  propertyId: string,
  idempotencyKey: string,
): Promise<CreateBookingResult | null> {
  const existing = await reservationRepository.findByIdempotencyKey(executor, propertyId, idempotencyKey);
  if (!existing) return null;
  const blockedRows = await reservationUnitRepository.listForReservation(executor, existing.id);
  logger.info("booking_idempotency_replay", { reservationId: existing.id, idempotencyKey });
  return { reservation: existing, blockedUnitIds: blockedRows.map((r) => r.unitId), replayed: true };
}

export const availabilityService = {
  async createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
    if (input.checkIn >= input.checkOut) {
      throw new ValidationError("checkOut must be after checkIn");
    }

    // Fast-path idempotency check, outside the transaction. This handles
    // the common case — a retry arriving well after the original request
    // already committed — without paying for a transaction. It is NOT what
    // makes idempotency race-safe under true concurrency: two requests
    // carrying the same key can both pass this read before either commits.
    // The actual guarantee comes from the UNIQUE(propertyId, idempotencyKey)
    // constraint plus the 23505 handling in the catch block below.
    if (input.idempotencyKey) {
      const replay = await findIdempotentReplay(db, input.propertyId, input.idempotencyKey);
      if (replay) return replay;
    }

    const property = await propertyRepository.findById(db, input.propertyId);
    if (!property) throw new NotFoundError("Property", input.propertyId);

    const unit = await unitRepository.findById(db, input.unitId);
    if (!unit || unit.propertyId !== input.propertyId) throw new NotFoundError("Unit", input.unitId);

    try {
      return await db.transaction(async (tx) => {
        // Re-check inside the transaction to close the window between the
        // fast-path read above and this transaction starting (e.g. two
        // sequential retries a few milliseconds apart). Still not
        // sufficient alone under simultaneous concurrent requests — see the
        // unique-violation handling below for the actual race-safety.
        if (input.idempotencyKey) {
          const replay = await findIdempotentReplay(tx, input.propertyId, input.idempotencyKey);
          if (replay) return replay;
        }

        const { writeSet, statusCheckSet } = await computeBookingSets(tx, input.unitId);

        for (const checkedUnitId of statusCheckSet) {
          const checkedUnit = await unitRepository.findById(tx, checkedUnitId);
          if (checkedUnit && checkedUnit.status !== "AVAILABLE") {
            throw new AvailabilityConflictError(
              `Unit "${checkedUnit.name}" is ${checkedUnit.status.toLowerCase().replace("_", " ")} and cannot be booked`,
              { unitId: checkedUnitId, status: checkedUnit.status },
            );
          }
        }

        const reservation = await reservationRepository.create(tx, {
          propertyId: input.propertyId,
          status: input.status ?? "CONFIRMED",
          source: input.source,
          externalReference: input.externalReference,
          idempotencyKey: input.idempotencyKey,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          createdBy: input.actorUserId,
        });

        await reservationUnitRepository.insertMany(
          tx,
          writeSet.map((blockedUnitId) => ({
            propertyId: input.propertyId,
            reservationId: reservation.id,
            unitId: blockedUnitId,
            blockType: blockedUnitId === input.unitId ? ("OCCUPIED" as const) : ("LINKED_BLOCK" as const),
            checkIn: input.checkIn,
            checkOut: input.checkOut,
          })),
        );

        await reservationActivityRepository.record(tx, {
          reservationId: reservation.id,
          action: "CREATED",
          actorUserId: input.actorUserId,
          notes: `source=${input.source}${input.externalReference ? ` externalRef=${input.externalReference}` : ""}`,
        });

        await auditService.record(tx, {
          organisationId: property.organisationId,
          propertyId: input.propertyId,
          actorUserId: input.actorUserId,
          action: "reservation.created",
          entityType: "reservation",
          entityId: reservation.id,
          after: { reservation, blockedUnitIds: writeSet },
        });

        return { reservation, blockedUnitIds: writeSet, replayed: false };
      });
    } catch (error) {
      if (isExclusionViolation(error)) {
        logger.warn("booking_conflict", { unitId: input.unitId, checkIn: input.checkIn, checkOut: input.checkOut });
        throw new AvailabilityConflictError(
          "The selected unit (or a linked unit) is no longer available for these dates",
          { unitId: input.unitId },
        );
      }

      if (input.idempotencyKey && isUniqueViolation(error)) {
        // Lost the INSERT race against a concurrent request carrying the
        // same idempotency key (both passed the pre-transaction read before
        // either committed). The winner's row is now committed — read it
        // back and hand it to the caller as a replay instead of surfacing a
        // spurious error for what is, from the caller's perspective, a
        // duplicate retry (the exact scenario OTA webhook retries produce).
        const replay = await findIdempotentReplay(db, input.propertyId, input.idempotencyKey);
        if (replay) return replay;
        // The unique_violation fired but the winning row isn't visible yet
        // (extremely unlikely under READ COMMITTED once the winner has
        // committed). Surface a conflict rather than silently retrying.
        throw new AvailabilityConflictError(
          "A booking with this idempotency key is being processed concurrently; retry shortly",
          { idempotencyKey: input.idempotencyKey },
        );
      }

      throw error;
    }
  },

  async cancelBooking(reservationId: string, actorUserId?: string, reason?: string) {
    return db.transaction(async (tx) => {
      const reservation = await reservationRepository.findById(tx, reservationId);
      if (!reservation) throw new NotFoundError("Reservation", reservationId);
      if (reservation.status === "CANCELLED") return reservation;

      const property = await propertyRepository.findById(tx, reservation.propertyId);
      if (!property) throw new NotFoundError("Property", reservation.propertyId);

      await reservationUnitRepository.deleteForReservation(tx, reservationId);
      const updated = await reservationRepository.updateStatus(tx, reservationId, "CANCELLED");

      await reservationActivityRepository.record(tx, {
        reservationId,
        action: "CANCELLED",
        actorUserId,
        notes: reason,
      });

      await auditService.record(tx, {
        organisationId: property.organisationId,
        propertyId: reservation.propertyId,
        actorUserId,
        action: "reservation.cancelled",
        entityType: "reservation",
        entityId: reservationId,
        before: reservation,
        after: updated,
      });

      return updated;
    });
  },

  async isAvailable(unitId: string, checkIn: string, checkOut: string): Promise<boolean> {
    const unit = await unitRepository.findById(db, unitId);
    if (!unit || unit.status !== "AVAILABLE") return false;

    const { writeSet, statusCheckSet } = await computeBookingSets(db, unitId);

    for (const checkedUnitId of statusCheckSet) {
      const checkedUnit = await unitRepository.findById(db, checkedUnitId);
      if (checkedUnit && checkedUnit.status !== "AVAILABLE") return false;
    }

    for (const blockedUnitId of writeSet) {
      const overlap = await reservationUnitRepository.hasOverlap(db, blockedUnitId, checkIn, checkOut);
      if (overlap) return false;
    }
    return true;
  },
};
