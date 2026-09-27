import { and, eq } from "drizzle-orm";
import { properties } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";
import type { CreatePropertyInput } from "@/domains/property/entities/property";

export const propertyRepository = {
  async create(executor: DbExecutor, input: CreatePropertyInput) {
    const [row] = await executor
      .insert(properties)
      .values({
        organisationId: input.organisationId,
        name: input.name,
        slug: input.slug,
        timezone: input.timezone ?? "Asia/Kolkata",
        currency: input.currency ?? "INR",
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      })
      .returning();
    return row!;
  },

  async findById(executor: DbExecutor, id: string) {
    const [row] = await executor.select().from(properties).where(eq(properties.id, id)).limit(1);
    return row ?? null;
  },

  async findBySlug(executor: DbExecutor, organisationId: string, slug: string) {
    const [row] = await executor
      .select()
      .from(properties)
      .where(and(eq(properties.organisationId, organisationId), eq(properties.slug, slug)))
      .limit(1);
    return row ?? null;
  },

  async listForOrganisation(executor: DbExecutor, organisationId: string) {
    return executor.select().from(properties).where(eq(properties.organisationId, organisationId));
  },
};
