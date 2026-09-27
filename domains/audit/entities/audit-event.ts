export type AuditAction =
  | "reservation.created"
  | "reservation.modified"
  | "reservation.cancelled"
  | "reservation.checked_in"
  | "reservation.checked_out"
  | "unit.status_changed"
  | "rate.override"
  | "user.created"
  | "user.role_granted"
  | "user.role_revoked"
  | "property.created"
  | "property.updated"
  | "unit.created"
  | "unit.updated"
  | "linked_inventory_group.created";

export interface RecordAuditEventInput {
  organisationId: string;
  propertyId?: string | null;
  actorUserId?: string | null;
  action: AuditAction | (string & {});
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}
