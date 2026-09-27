import { reservationActivity } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";

export const reservationActivityRepository = {
  async record(executor: DbExecutor, input: { reservationId: string; action: string; actorUserId?: string; notes?: string }) {
    const [row] = await executor
      .insert(reservationActivity)
      .values({
        reservationId: input.reservationId,
        action: input.action,
        actorUserId: input.actorUserId ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    return row!;
  },
};
