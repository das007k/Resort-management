import { eq } from "drizzle-orm";
import { buildings } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";
import type { CreateBuildingInput } from "@/domains/inventory/entities/inventory";

export const buildingRepository = {
  async create(executor: DbExecutor, input: CreateBuildingInput) {
    const [row] = await executor.insert(buildings).values(input).returning();
    return row!;
  },
  async listForProperty(executor: DbExecutor, propertyId: string) {
    return executor.select().from(buildings).where(eq(buildings.propertyId, propertyId));
  },
  async findById(executor: DbExecutor, id: string) {
    const [row] = await executor.select().from(buildings).where(eq(buildings.id, id)).limit(1);
    return row ?? null;
  },
};
