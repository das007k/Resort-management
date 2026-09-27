import { and, eq, gt, lt } from "drizzle-orm";
import { reservationUnits } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";
import type { CreateReservationUnitInput } from "@/domains/reservations/entities/reservation";

export const reservationUnitRepository = {
  /**
   * Inserts one blocking row per unit in the blocking set. This is the
   * statement that the database-level EXCLUDE constraint
   * (reservation_units_no_overlap) guards — if any row here overlaps an
   * existing, active booking for the same unit, Postgres rejects the whole
   * INSERT with error 23P01 (exclusion_violation), which the service layer
   * converts into an AvailabilityConflictError.
   */
  async insertMany(executor: DbExecutor, rows: CreateReservationUnitInput[]) {
    if (rows.length === 0) return [];
    return executor.insert(reservationUnits).values(rows).returning();
  },

  async deleteForReservation(executor: DbExecutor, reservationId: string) {
    return executor.delete(reservationUnits).where(eq(reservationUnits.reservationId, reservationId)).returning();
  },

  async listForReservation(executor: DbExecutor, reservationId: string) {
    return executor.select().from(reservationUnits).where(eq(reservationUnits.reservationId, reservationId));
  },

  /** Best-effort read-only overlap check (e.g. for calendar/search UI). NOT
   * the source of truth for correctness under concurrency — the database
   * EXCLUDE constraint is. */
  async hasOverlap(executor: DbExecutor, unitId: string, checkIn: string, checkOut: string): Promise<boolean> {
    const rows = await executor
      .select()
      .from(reservationUnits)
      .where(
        and(
          eq(reservationUnits.unitId, unitId),
          lt(reservationUnits.checkIn, checkOut),
          gt(reservationUnits.checkOut, checkIn),
        ),
      );
    return rows.length > 0;
  },
};
