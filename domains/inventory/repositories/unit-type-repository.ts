import { eq } from "drizzle-orm";
import { unitTypes } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";
import type { CreateUnitTypeInput } from "@/domains/inventory/entities/inventory";

export const unitTypeRepository = {
  async create(executor: DbExecutor, input: CreateUnitTypeInput) {
    const [row] = await executor.insert(unitTypes).values(input).returning();
    return row!;
  },
  async listForProperty(executor: DbExecutor, propertyId: string) {
    return executor.select().from(unitTypes).where(eq(unitTypes.propertyId, propertyId));
  },
  async findById(executor: DbExecutor, id: string) {
    const [row] = await executor.select().from(unitTypes).where(eq(unitTypes.id, id)).limit(1);
    return row ?? null;
  },
};
