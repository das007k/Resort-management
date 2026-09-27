import { eq } from "drizzle-orm";
import { units } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";
import type { CreateUnitInput } from "@/domains/inventory/entities/inventory";

export const unitRepository = {
  async create(executor: DbExecutor, input: CreateUnitInput) {
    const [row] = await executor.insert(units).values(input).returning();
    return row!;
  },

  async findById(executor: DbExecutor, id: string) {
    const [row] = await executor.select().from(units).where(eq(units.id, id)).limit(1);
    return row ?? null;
  },

  async listForProperty(executor: DbExecutor, propertyId: string) {
    return executor.select().from(units).where(eq(units.propertyId, propertyId));
  },

  async setStatus(executor: DbExecutor, id: string, status: "AVAILABLE" | "OUT_OF_ORDER" | "INACTIVE") {
    const [row] = await executor.update(units).set({ status, updatedAt: new Date() }).where(eq(units.id, id)).returning();
    return row!;
  },
};
