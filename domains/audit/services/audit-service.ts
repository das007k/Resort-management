import type { DbExecutor } from "@/platform/db/types";
import { auditRepository } from "@/domains/audit/repositories/audit-repository";
import type { RecordAuditEventInput } from "@/domains/audit/entities/audit-event";
import { logger } from "@/platform/observability/logger";

/**
 * Every domain service that mutates a record important enough to need
 * auditability (mandatory principle §5) should call `record` in the SAME
 * database transaction as the mutation itself, so the audit trail can never
 * silently drift from what actually happened.
 */
export const auditService = {
  async record(executor: DbExecutor, input: RecordAuditEventInput) {
    const event = await auditRepository.insert(executor, input);
    logger.info("audit_event", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorUserId: input.actorUserId ?? null,
    });
    return event;
  },

  async historyFor(executor: DbExecutor, entityType: string, entityId: string) {
    return auditRepository.listForEntity(executor, entityType, entityId);
  },
};
