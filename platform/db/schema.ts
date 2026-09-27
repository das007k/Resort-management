// StayAxis — Phase 1 core data model (Drizzle ORM / PostgreSQL)
//
// Money is ALWAYS stored as an integer in the currency's minor unit
// (e.g. paise for INR). Never store money as float/real.

import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  integer,
  boolean,
  date,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createId } from "@/platform/db/id";

const id = () => text("id").primaryKey().$defaultFn(createId);
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const recordStatusEnum = pgEnum("record_status", ["ACTIVE", "INACTIVE"]);
export const unitStatusEnum = pgEnum("unit_status", ["AVAILABLE", "OUT_OF_ORDER", "INACTIVE"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "TENTATIVE",
  "CONFIRMED",
  "MODIFIED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
]);
export const reservationSourceEnum = pgEnum("reservation_source", ["MANUAL", "DIRECT", "OTA", "WALK_IN"]);
export const paymentStatusEnum = pgEnum("payment_status", ["UNPAID", "PARTIALLY_PAID", "PAID", "REFUNDED"]);
export const folioStatusEnum = pgEnum("folio_status", ["OPEN", "CLOSED"]);
export const paymentTxnStatusEnum = pgEnum("payment_txn_status", ["PENDING", "SUCCESS", "FAILED"]);
export const housekeepingStatusEnum = pgEnum("housekeeping_status", ["DIRTY", "CLEANING", "INSPECTED", "READY"]);
export const maintenanceStatusEnum = pgEnum("maintenance_status", ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
export const syncEventStatusEnum = pgEnum("sync_event_status", ["PENDING", "SUCCESS", "FAILED", "RETRYING"]);
export const messageStatusEnum = pgEnum("message_status", ["QUEUED", "SENT", "DELIVERED", "FAILED"]);
// OCCUPIED = the unit the guest actually occupies; LINKED_BLOCK = a sibling
// unit blocked as a side effect (e.g. booking the whole cottage blocks each
// bedroom; booking a bedroom blocks the whole-cottage unit).
export const reservationUnitBlockTypeEnum = pgEnum("reservation_unit_block_type", ["OCCUPIED", "LINKED_BLOCK"]);

// ---------------------------------------------------------------------------
// Identity & Access
// ---------------------------------------------------------------------------

export const organisations = pgTable("organisations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: recordStatusEnum("status").notNull().default("ACTIVE"),
  ...timestamps,
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
});

export const properties = pgTable(
  "properties",
  {
    id: id(),
    organisationId: text("organisation_id").notNull().references(() => organisations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    currency: text("currency").notNull().default("INR"),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    ...timestamps,
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  },
  (t) => [
    uniqueIndex("properties_org_slug_uq").on(t.organisationId, t.slug),
    index("properties_org_idx").on(t.organisationId),
    // Lets other tables declare a COMPOSITE foreign key of
    // (organisation_id, property_id) back to this table, so the database
    // itself rejects a row whose recorded organisation doesn't match the
    // property's actual organisation — not just its property id. Used by
    // user_property_access (see below).
    uniqueIndex("properties_org_id_uq").on(t.organisationId, t.id),
  ],
);

export const users = pgTable(
  "users",
  {
    id: id(),
    organisationId: text("organisation_id").notNull().references(() => organisations.id),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    ...timestamps,
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  },
  (t) => [
    // Email is unique ACROSS THE WHOLE PLATFORM, not just within an
    // organisation. The login screen takes only email + password (no
    // organisation selector), so if two different organisations could each
    // have a user with the same email, login would be ambiguous — the old
    // per-org uniqueness let that happen. Global uniqueness makes "which
    // user does this email belong to" a well-defined question again.
    uniqueIndex("users_email_uq").on(t.email),
    index("users_org_idx").on(t.organisationId),
    // Composite FK target for user_property_access — see below.
    uniqueIndex("users_org_id_uq").on(t.organisationId, t.id),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: id(),
    organisationId: text("organisation_id").notNull().references(() => organisations.id),
    name: text("name").notNull(),
    description: text("description"),
    isSystemRole: boolean("is_system_role").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("roles_org_name_uq").on(t.organisationId, t.name),
    // Composite FK target for user_property_access — see below.
    uniqueIndex("roles_org_id_uq").on(t.organisationId, t.id),
  ],
);

export const permissions = pgTable("permissions", {
  id: id(),
  key: text("key").notNull().unique(), // e.g. "refund.approve", "rate.override"
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

// A user's role is granted per-property, so RBAC is property-scoped, not just org-scoped.
export const userPropertyAccess = pgTable(
  "user_property_access",
  {
    id: id(),
    // Denormalized on purpose: this is the organisation the grant ITSELF
    // claims to be for. The three composite foreign keys below force
    // Postgres to verify that claim against the user's, the property's, and
    // the role's ACTUAL organisation — so a grant can never link a user,
    // property, and role that don't all belong to the same organisation.
    // Without this, RBAC checks (which trust userPropertyAccess) could be
    // fooled by e.g. granting a Property A (org X) user a Role from org Y.
    organisationId: text("organisation_id").notNull().references(() => organisations.id),
    userId: text("user_id").notNull().references(() => users.id),
    propertyId: text("property_id").notNull().references(() => properties.id),
    roleId: text("role_id").notNull().references(() => roles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("upa_user_property_uq").on(t.userId, t.propertyId),
    index("upa_property_idx").on(t.propertyId),
    index("upa_org_idx").on(t.organisationId),
    foreignKey({
      columns: [t.organisationId, t.userId],
      foreignColumns: [users.organisationId, users.id],
      name: "upa_org_user_fk",
    }),
    foreignKey({
      columns: [t.organisationId, t.propertyId],
      foreignColumns: [properties.organisationId, properties.id],
      name: "upa_org_property_fk",
    }),
    foreignKey({
      columns: [t.organisationId, t.roleId],
      foreignColumns: [roles.organisationId, roles.id],
      name: "upa_org_role_fk",
    }),
  ],
);

// ---------------------------------------------------------------------------
// Property / Inventory (incl. linked-inventory)
// ---------------------------------------------------------------------------

export const buildings = pgTable(
  "buildings",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    name: text("name").notNull(),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (t) => [
    index("buildings_property_idx").on(t.propertyId),
    // Composite FK target for units — see below.
    uniqueIndex("buildings_property_id_uq").on(t.propertyId, t.id),
  ],
);

export const unitTypes = pgTable(
  "unit_types",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    name: text("name").notNull(), // e.g. "2BHK Cottage", "Standard Bedroom"
    maxOccupancy: integer("max_occupancy").notNull(),
    ...timestamps,
  },
  (t) => [
    index("unit_types_property_idx").on(t.propertyId),
    // Composite FK target for units — see below.
    uniqueIndex("unit_types_property_id_uq").on(t.propertyId, t.id),
  ],
);

// A sellable unit: a whole cottage OR one of its bedrooms.
// Linked-inventory relationships are modeled via linkedInventoryGroups + linkedInventoryMembers.
export const units = pgTable(
  "units",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    buildingId: text("building_id").notNull().references(() => buildings.id),
    unitTypeId: text("unit_type_id").notNull().references(() => unitTypes.id),
    name: text("name").notNull(), // e.g. "Cottage 3", "Cottage 3 - Bedroom A"
    status: unitStatusEnum("status").notNull().default("AVAILABLE"),
    ...timestamps,
  },
  (t) => [
    index("units_property_idx").on(t.propertyId),
    index("units_building_idx").on(t.buildingId),
    // Composite FK target for linked_inventory_members / reservation_units — see below.
    uniqueIndex("units_property_id_uq").on(t.propertyId, t.id),
    // A unit's building and unit-type must belong to the SAME property as
    // the unit itself — otherwise e.g. a Property A unit could reference a
    // Property B building, silently corrupting per-property inventory data.
    foreignKey({
      columns: [t.propertyId, t.buildingId],
      foreignColumns: [buildings.propertyId, buildings.id],
      name: "units_property_building_fk",
    }),
    foreignKey({
      columns: [t.propertyId, t.unitTypeId],
      foreignColumns: [unitTypes.propertyId, unitTypes.id],
      name: "units_property_unit_type_fk",
    }),
  ],
);

// One group represents one physical cottage's sellable configuration:
// members = [the whole-cottage unit (isParent=true), bedroom A unit, bedroom B unit].
// The availability service uses this to block siblings when one member is booked.
export const linkedInventoryGroups = pgTable(
  "linked_inventory_groups",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    name: text("name").notNull(),
    allowSeparateSale: boolean("allow_separate_sale").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("ling_property_idx").on(t.propertyId),
    // Composite FK target for linked_inventory_members — see below.
    uniqueIndex("ling_property_id_uq").on(t.propertyId, t.id),
  ],
);

export const linkedInventoryMembers = pgTable(
  "linked_inventory_members",
  {
    id: id(),
    // Denormalized on purpose, same reasoning as user_property_access above:
    // the two composite FKs below force Postgres to verify that the group
    // AND the unit both actually belong to this same property, so a
    // cross-property link (accidentally or via a compromised client) is
    // rejected at the database layer, not just by service-layer code.
    propertyId: text("property_id").notNull().references(() => properties.id),
    groupId: text("group_id").notNull().references(() => linkedInventoryGroups.id, { onDelete: "cascade" }),
    unitId: text("unit_id").notNull().unique().references(() => units.id), // a unit belongs to at most one group
    isParent: boolean("is_parent").notNull().default(false), // true = the whole-cottage sellable unit
  },
  (t) => [
    index("linm_group_idx").on(t.groupId),
    index("linm_property_idx").on(t.propertyId),
    foreignKey({
      columns: [t.propertyId, t.groupId],
      foreignColumns: [linkedInventoryGroups.propertyId, linkedInventoryGroups.id],
      name: "linm_property_group_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.propertyId, t.unitId],
      foreignColumns: [units.propertyId, units.id],
      name: "linm_property_unit_fk",
    }),
  ],
);

// ---------------------------------------------------------------------------
// Rates & Revenue
// ---------------------------------------------------------------------------

export const ratePlans = pgTable(
  "rate_plans",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    unitTypeId: text("unit_type_id").notNull().references(() => unitTypes.id),
    name: text("name").notNull(),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (t) => [index("rate_plans_property_idx").on(t.propertyId)],
);

export const dailyRates = pgTable(
  "daily_rates",
  {
    id: id(),
    ratePlanId: text("rate_plan_id").notNull().references(() => ratePlans.id),
    unitId: text("unit_id").notNull().references(() => units.id),
    date: date("date").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("INR"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("daily_rates_plan_unit_date_uq").on(t.ratePlanId, t.unitId, t.date),
    index("daily_rates_unit_date_idx").on(t.unitId, t.date),
  ],
);

export const availabilityRestrictions = pgTable(
  "availability_restrictions",
  {
    id: id(),
    unitId: text("unit_id").notNull().references(() => units.id),
    date: date("date").notNull(),
    stopSell: boolean("stop_sell").notNull().default(false),
    minStay: integer("min_stay"),
    ...timestamps,
  },
  (t) => [uniqueIndex("avail_restr_unit_date_uq").on(t.unitId, t.date)],
);

// ---------------------------------------------------------------------------
// Guests & Reservations
// ---------------------------------------------------------------------------

export const guests = pgTable(
  "guests",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    ...timestamps,
  },
  (t) => [index("guests_property_idx").on(t.propertyId)],
);

export const reservations = pgTable(
  "reservations",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    status: reservationStatusEnum("status").notNull().default("TENTATIVE"),
    source: reservationSourceEnum("source").notNull().default("MANUAL"),
    externalReference: text("external_reference"), // OTA reservation id
    idempotencyKey: text("idempotency_key"), // dedupe key for OTA retries / API submissions
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("UNPAID"),
    ...timestamps,
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
  },
  (t) => [
    uniqueIndex("reservations_property_idempotency_uq").on(t.propertyId, t.idempotencyKey),
    index("reservations_property_status_idx").on(t.propertyId, t.status),
    index("reservations_external_ref_idx").on(t.externalReference),
    // Composite FK target for reservation_units — see below.
    uniqueIndex("reservations_property_id_uq").on(t.propertyId, t.id),
  ],
);

export const reservationGuests = pgTable(
  "reservation_guests",
  {
    id: id(),
    reservationId: text("reservation_id").notNull().references(() => reservations.id),
    guestId: text("guest_id").notNull().references(() => guests.id),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [uniqueIndex("res_guests_uq").on(t.reservationId, t.guestId)],
);

// The core linked-inventory booking record: which physical unit(s) this
// reservation occupies for which date range. The availability service
// creates rows here only after confirming no conflicting overlap exists
// for this unit OR any sibling unit in its linked inventory group.
export const reservationUnits = pgTable(
  "reservation_units",
  {
    id: id(),
    // Denormalized on purpose, same reasoning as user_property_access /
    // linked_inventory_members above: the two composite FKs below force
    // Postgres to verify the reservation and the unit both actually belong
    // to this same property, so a reservation for Property A can never end
    // up occupying a Property B unit.
    propertyId: text("property_id").notNull().references(() => properties.id),
    reservationId: text("reservation_id").notNull().references(() => reservations.id),
    unitId: text("unit_id").notNull().references(() => units.id),
    blockType: reservationUnitBlockTypeEnum("block_type").notNull().default("OCCUPIED"),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("res_units_unit_dates_idx").on(t.unitId, t.checkIn, t.checkOut),
    index("res_units_reservation_idx").on(t.reservationId),
    index("res_units_property_idx").on(t.propertyId),
    foreignKey({
      columns: [t.propertyId, t.reservationId],
      foreignColumns: [reservations.propertyId, reservations.id],
      name: "res_units_property_reservation_fk",
    }),
    foreignKey({
      columns: [t.propertyId, t.unitId],
      foreignColumns: [units.propertyId, units.id],
      name: "res_units_property_unit_fk",
    }),
    // The actual overlap-prevention guarantee (mandatory principle §6: "these
    // rules must be enforced ... in the database transaction layer") is a
    // hand-written EXCLUDE constraint added in migration 0002 — see
    // db/migrations/0002_reservation_units_no_overlap.sql. It cannot be
    // expressed in Drizzle's table-builder DSL, so it isn't declared here.
  ],
);

export const reservationActivity = pgTable(
  "reservation_activity",
  {
    id: id(),
    reservationId: text("reservation_id").notNull().references(() => reservations.id),
    action: text("action").notNull(), // "CREATED", "MODIFIED", "CANCELLED", "CHECKED_IN", ...
    actorUserId: text("actor_user_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("res_activity_reservation_idx").on(t.reservationId)],
);

// ---------------------------------------------------------------------------
// Folios & Payments
// ---------------------------------------------------------------------------

export const folios = pgTable(
  "folios",
  {
    id: id(),
    reservationId: text("reservation_id").notNull().references(() => reservations.id),
    status: folioStatusEnum("status").notNull().default("OPEN"),
    ...timestamps,
  },
  (t) => [index("folios_reservation_idx").on(t.reservationId)],
);

export const folioItems = pgTable(
  "folio_items",
  {
    id: id(),
    folioId: text("folio_id").notNull().references(() => folios.id),
    description: text("description").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("INR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("folio_items_folio_idx").on(t.folioId)],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    folioId: text("folio_id").notNull().references(() => folios.id),
    provider: text("provider").notNull(), // "razorpay" | "mock"
    providerOrderId: text("provider_order_id"),
    providerPaymentId: text("provider_payment_id"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: paymentTxnStatusEnum("status").notNull().default("PENDING"),
    webhookVerified: boolean("webhook_verified").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("payments_provider_payment_uq").on(t.provider, t.providerPaymentId),
    index("payments_folio_idx").on(t.folioId),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    id: id(),
    paymentId: text("payment_id").notNull().references(() => payments.id),
    amountMinor: integer("amount_minor").notNull(),
    reason: text("reason"),
    status: paymentTxnStatusEnum("status").notNull().default("PENDING"),
    ...timestamps,
  },
  (t) => [index("refunds_payment_idx").on(t.paymentId)],
);

export const settlements = pgTable(
  "settlements",
  {
    id: id(),
    provider: text("provider").notNull(),
    settlementRef: text("settlement_ref").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("INR"),
    settledAt: timestamp("settled_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("settlements_provider_ref_uq").on(t.provider, t.settlementRef)],
);

// ---------------------------------------------------------------------------
// Housekeeping & Maintenance
// ---------------------------------------------------------------------------

export const housekeepingTasks = pgTable(
  "housekeeping_tasks",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    unitId: text("unit_id").notNull().references(() => units.id),
    status: housekeepingStatusEnum("status").notNull().default("DIRTY"),
    assignedTo: text("assigned_to"),
    priority: integer("priority").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("hk_tasks_property_status_idx").on(t.propertyId, t.status),
    index("hk_tasks_unit_idx").on(t.unitId),
  ],
);

export const maintenanceTickets = pgTable(
  "maintenance_tickets",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    unitId: text("unit_id").references(() => units.id),
    title: text("title").notNull(),
    description: text("description"),
    status: maintenanceStatusEnum("status").notNull().default("OPEN"),
    ...timestamps,
  },
  (t) => [index("maint_tickets_property_status_idx").on(t.propertyId, t.status)],
);

// ---------------------------------------------------------------------------
// Distribution / OTA
// ---------------------------------------------------------------------------

export const distributionChannels = pgTable(
  "distribution_channels",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    name: text("name").notNull(), // e.g. "Booking.com (sandbox)"
    providerKey: text("provider_key").notNull(), // maps to a providers/channel-manager adapter
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (t) => [index("dist_channels_property_idx").on(t.propertyId)],
);

export const externalReservationMappings = pgTable(
  "external_reservation_mappings",
  {
    id: id(),
    channelId: text("channel_id").notNull().references(() => distributionChannels.id),
    externalId: text("external_id").notNull(),
    reservationId: text("reservation_id").notNull().references(() => reservations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ext_res_map_channel_external_uq").on(t.channelId, t.externalId)],
);

export const channelSyncEvents = pgTable(
  "channel_sync_events",
  {
    id: id(),
    channelId: text("channel_id").notNull().references(() => distributionChannels.id),
    eventType: text("event_type").notNull(), // RATE_PUBLISH, AVAILABILITY_PUBLISH, RESERVATION_INGEST, ...
    idempotencyKey: text("idempotency_key"),
    status: syncEventStatusEnum("status").notNull().default("PENDING"),
    payload: jsonb("payload"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("channel_sync_channel_idem_uq").on(t.channelId, t.idempotencyKey),
    index("channel_sync_channel_status_idx").on(t.channelId, t.status),
  ],
);

// ---------------------------------------------------------------------------
// Communications
// ---------------------------------------------------------------------------

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: id(),
    propertyId: text("property_id").notNull().references(() => properties.id),
    key: text("key").notNull(), // e.g. "booking_confirmation"
    channel: text("channel").notNull(), // "whatsapp" | "email" | "sms"
    body: text("body").notNull(),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (t) => [uniqueIndex("msg_templates_property_key_channel_uq").on(t.propertyId, t.key, t.channel)],
);

export const messageExecutions = pgTable(
  "message_executions",
  {
    id: id(),
    templateId: text("template_id").notNull().references(() => messageTemplates.id),
    toAddress: text("to_address").notNull(),
    status: messageStatusEnum("status").notNull().default("QUEUED"),
    providerRef: text("provider_ref"),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (t) => [index("msg_exec_template_status_idx").on(t.templateId, t.status)],
);

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    organisationId: text("organisation_id").notNull().references(() => organisations.id),
    propertyId: text("property_id").references(() => properties.id),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(), // e.g. "reservation.created", "rate.override"
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_org_created_idx").on(t.organisationId, t.createdAt),
    index("audit_entity_idx").on(t.entityType, t.entityId),
  ],
);
