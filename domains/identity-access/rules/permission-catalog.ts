/**
 * The full permission catalog (mandatory principle §14). Business code
 * never checks a role by name — it always checks a permission key via
 * rbacService.hasPermission(...). Roles are just named bundles of these
 * keys, editable per organisation without touching code.
 */
export const PERMISSIONS = {
  REFUND_APPROVE: "refund.approve",
  DISCOUNT_APPLY: "discount.apply",
  RATE_OVERRIDE: "rate.override",
  BILL_CANCEL: "bill.cancel",
  BOOKING_CANCEL: "booking.cancel",
  INVENTORY_MANUAL_OVERRIDE: "inventory.manual_override",
  USER_ADMINISTER: "user.administer",
  REPORTS_FINANCIAL_VIEW: "reports.financial.view",
  INTEGRATION_RETRY: "integration.retry",
  AUDIT_LOG_VIEW: "audit.log.view",

  // Day-to-day operational permissions needed by Phase 2+ but defined now
  // so role seeding is complete and stable.
  RESERVATION_CREATE: "reservation.create",
  RESERVATION_MODIFY: "reservation.modify",
  FRONT_DESK_CHECKIN: "front_desk.checkin",
  FRONT_DESK_CHECKOUT: "front_desk.checkout",
  HOUSEKEEPING_UPDATE: "housekeeping.update",
  HOUSEKEEPING_INSPECT: "housekeeping.inspect",
  MAINTENANCE_MANAGE: "maintenance.manage",
  REVENUE_PUBLISH_RATES: "revenue.publish_rates",
  PROPERTY_CONFIGURE: "property.configure",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_CATALOG: Array<{ key: PermissionKey; description: string }> = [
  { key: PERMISSIONS.REFUND_APPROVE, description: "Approve and issue guest refunds" },
  { key: PERMISSIONS.DISCOUNT_APPLY, description: "Apply discounts to a folio" },
  { key: PERMISSIONS.RATE_OVERRIDE, description: "Manually override a published rate" },
  { key: PERMISSIONS.BILL_CANCEL, description: "Cancel/void a posted folio item" },
  { key: PERMISSIONS.BOOKING_CANCEL, description: "Cancel a reservation" },
  { key: PERMISSIONS.INVENTORY_MANUAL_OVERRIDE, description: "Manually override unit availability/status" },
  { key: PERMISSIONS.USER_ADMINISTER, description: "Create/edit users and role assignments" },
  { key: PERMISSIONS.REPORTS_FINANCIAL_VIEW, description: "View financial reports" },
  { key: PERMISSIONS.INTEGRATION_RETRY, description: "Manually retry a failed integration sync event" },
  { key: PERMISSIONS.AUDIT_LOG_VIEW, description: "View the audit log" },
  { key: PERMISSIONS.RESERVATION_CREATE, description: "Create a new reservation" },
  { key: PERMISSIONS.RESERVATION_MODIFY, description: "Modify an existing reservation" },
  { key: PERMISSIONS.FRONT_DESK_CHECKIN, description: "Check a guest in" },
  { key: PERMISSIONS.FRONT_DESK_CHECKOUT, description: "Check a guest out" },
  { key: PERMISSIONS.HOUSEKEEPING_UPDATE, description: "Update housekeeping task status" },
  { key: PERMISSIONS.HOUSEKEEPING_INSPECT, description: "Perform supervisor inspection sign-off" },
  { key: PERMISSIONS.MAINTENANCE_MANAGE, description: "Create/manage maintenance tickets" },
  { key: PERMISSIONS.REVENUE_PUBLISH_RATES, description: "Publish rate changes after review" },
  { key: PERMISSIONS.PROPERTY_CONFIGURE, description: "Configure property/unit/inventory setup" },
];

/** Initial roles (mandatory principle §14) and their default permission bundles. */
export const DEFAULT_ROLES: Record<string, { description: string; permissions: PermissionKey[] }> = {
  Owner: {
    description: "Full access across all modules",
    permissions: PERMISSION_CATALOG.map((p) => p.key),
  },
  Administrator: {
    description: "Full operational + user administration access",
    permissions: PERMISSION_CATALOG.map((p) => p.key),
  },
  "Resort Manager": {
    description: "Full operational access, excluding user administration",
    permissions: PERMISSION_CATALOG.map((p) => p.key).filter((k) => k !== PERMISSIONS.USER_ADMINISTER),
  },
  "Front Office": {
    description: "Reservations, check-in/out, bookings",
    permissions: [
      PERMISSIONS.RESERVATION_CREATE,
      PERMISSIONS.RESERVATION_MODIFY,
      PERMISSIONS.FRONT_DESK_CHECKIN,
      PERMISSIONS.FRONT_DESK_CHECKOUT,
      PERMISSIONS.BOOKING_CANCEL,
    ],
  },
  "Housekeeping Supervisor": {
    description: "Housekeeping task management and inspection",
    permissions: [PERMISSIONS.HOUSEKEEPING_UPDATE, PERMISSIONS.HOUSEKEEPING_INSPECT],
  },
  "Housekeeping Staff": {
    description: "Update assigned housekeeping tasks",
    permissions: [PERMISSIONS.HOUSEKEEPING_UPDATE],
  },
  Accountant: {
    description: "Financial reports, refunds, bill cancellation",
    permissions: [PERMISSIONS.REFUND_APPROVE, PERMISSIONS.BILL_CANCEL, PERMISSIONS.REPORTS_FINANCIAL_VIEW],
  },
  "Maintenance Staff": {
    description: "Maintenance ticket management",
    permissions: [PERMISSIONS.MAINTENANCE_MANAGE],
  },
  "Revenue Manager": {
    description: "Rate management and publication",
    permissions: [PERMISSIONS.RATE_OVERRIDE, PERMISSIONS.REVENUE_PUBLISH_RATES],
  },
  "Read-only Advisor": {
    description: "View-only access to reports and audit log",
    permissions: [PERMISSIONS.REPORTS_FINANCIAL_VIEW, PERMISSIONS.AUDIT_LOG_VIEW],
  },
};
