import { and, desc, eq } from "drizzle-orm";
import { auditEvents } from "@/platform/db/schema";
import type { DbExecutor } from "@/platform/db/types";
import type { RecordAuditEventInput } from "@/domains/audit/entities/audit-event";

export const auditRepository = {
  async insert(executor: DbExecutor, input: RecordAuditEventInput) {
    const [row] = await executor
      .insert(auditEvents)
      .values({
        organisationId: input.organisationId,
        propertyId: input.propertyId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before as any,
        after: input.after as any,
      })
      .returning();
    return row!;
  },

  async listForEntity(executor: DbExecutor, entityType: string, entityId: string) {
    return executor
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entityType, entityType), eq(auditEvents.entityId, entityId)))
      .orderBy(desc(auditEvents.createdAt));
  },
};
