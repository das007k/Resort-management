import { eq } from "drizzle-orm";
import { organisations } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";
import type { CreateOrganisationInput } from "@/domains/property/entities/property";

export const organisationRepository = {
  async create(executor: DbExecutor, input: CreateOrganisationInput) {
    const [row] = await executor.insert(organisations).values(input).returning();
    return row!;
  },

  async findBySlug(executor: DbExecutor, slug: string) {
    const [row] = await executor.select().from(organisations).where(eq(organisations.slug, slug)).limit(1);
    return row ?? null;
  },

  async findById(executor: DbExecutor, id: string) {
    const [row] = await executor.select().from(organisations).where(eq(organisations.id, id)).limit(1);
    return row ?? null;
  },
};
