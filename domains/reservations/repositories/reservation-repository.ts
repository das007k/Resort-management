import { and, eq } from "drizzle-orm";
import { reservations } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";
import type { CreateReservationRecordInput } from "@/domains/reservations/entities/reservation";

export const reservationRepository = {
  async create(executor: DbExecutor, input: CreateReservationRecordInput) {
    const [row] = await executor
      .insert(reservations)
      .values({
        propertyId: input.propertyId,
        status: input.status,
        source: input.source,
        externalReference: input.externalReference ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        createdBy: input.createdBy,
        updatedBy: input.createdBy,
      })
      .returning();
    return row!;
  },

  async findById(executor: DbExecutor, id: string) {
    const [row] = await executor.select().from(reservations).where(eq(reservations.id, id)).limit(1);
    return row ?? null;
  },

  async findByIdempotencyKey(executor: DbExecutor, propertyId: string, idempotencyKey: string) {
    const [row] = await executor
      .select()
      .from(reservations)
      .where(and(eq(reservations.propertyId, propertyId), eq(reservations.idempotencyKey, idempotencyKey)))
      .limit(1);
    return row ?? null;
  },

  async updateStatus(executor: DbExecutor, id: string, status: (typeof reservations.$inferSelect)["status"]) {
    const [row] = await executor
      .update(reservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return row!;
  },
};
