import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey(),
  quoteNo: text("quote_no").notNull(),
  guest: text("guest").notNull(),
  phone: text("phone").notNull().default(""),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  unit: text("unit").notNull(),
  adults: integer("adults").notNull().default(1),
  olderChildren: integer("older_children").notNull().default(0),
  youngChildren: integer("young_children").notNull().default(0),
  mealPlan: text("meal_plan").notNull().default("Room only"),
  servicesJson: text("services_json").notNull().default("[]"),
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  tax: integer("tax").notNull().default(0),
  accommodationTax: integer("accommodation_tax").notNull().default(0),
  serviceTax: integer("service_tax").notNull().default(0),
  total: integer("total").notNull().default(0),
  status: text("status").notNull().default("Draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_quotes_quote_no").on(table.quoteNo),
  index("idx_quotes_status_created_at").on(table.status, table.createdAt),
]);

export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(),
  quoteId: text("quote_id").references(() => quotes.id),
  guest: text("guest").notNull(),
  phone: text("phone").notNull().default(""),
  unit: text("unit").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  source: text("source").notNull().default("Direct"),
  amount: integer("amount").notNull().default(0),
  paid: integer("paid").notNull().default(0),
  status: text("status").notNull().default("Pending"),
  channelReservationId: text("channel_reservation_id").notNull().default(""),
  channelStatus: text("channel_status").notNull().default("New"),
  acknowledgementStatus: text("acknowledgement_status").notNull().default("Not required"),
  guestEmail: text("guest_email").notNull().default(""),
  guestCountry: text("guest_country").notNull().default(""),
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  childrenAgesJson: text("children_ages_json").notNull().default("[]"),
  ratePlan: text("rate_plan").notNull().default("Standard"),
  mealPlan: text("meal_plan").notNull().default("Room only"),
  currency: text("currency").notNull().default("INR"),
  taxes: integer("taxes").notNull().default(0),
  fees: integer("fees").notNull().default(0),
  commission: integer("commission").notNull().default(0),
  paymentModel: text("payment_model").notNull().default("Pay at property"),
  guaranteeStatus: text("guarantee_status").notNull().default("Not guaranteed"),
  cancellationPolicy: text("cancellation_policy").notNull().default(""),
  cancellationDeadline: text("cancellation_deadline"),
  specialRequests: text("special_requests").notNull().default(""),
  arrivalTime: text("arrival_time"),
  lastModifiedAt: text("last_modified_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_reservations_quote_id").on(table.quoteId),
  index("idx_reservations_status_check_in").on(table.status, table.checkIn),
]);

export const reservationEvents = sqliteTable("reservation_events", {
  id: text("id").primaryKey(),
  reservationId: text("reservation_id").notNull().references(() => reservations.id),
  eventType: text("event_type").notNull(),
  source: text("source").notNull().default("StayAxis"),
  externalEventId: text("external_event_id").notNull().default(""),
  payloadJson: text("payload_json").notNull().default("{}"),
  acknowledgementStatus: text("acknowledgement_status").notNull().default("Not required"),
  processedAt: text("processed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  processedByEmail: text("processed_by_email").notNull().default(""),
}, (table) => [index("idx_reservation_events_reservation").on(table.reservationId, table.processedAt), uniqueIndex("idx_reservation_events_external").on(table.source, table.externalEventId)]);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  reservationId: text("reservation_id").notNull().references(() => reservations.id),
  reference: text("reference").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("Payment link"),
  status: text("status").notNull().default("Pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  paidAt: text("paid_at"),
}, (table) => [
  uniqueIndex("idx_payments_reference").on(table.reference),
  index("idx_payments_reservation_status").on(table.reservationId, table.status),
]);

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  reservationId: text("reservation_id").notNull().references(() => reservations.id),
  invoiceNo: text("invoice_no").notNull(),
  guest: text("guest").notNull(),
  phone: text("phone").notNull().default(""),
  itemsJson: text("items_json").notNull().default("[]"),
  subtotal: integer("subtotal").notNull().default(0),
  accommodationTax: integer("accommodation_tax").notNull().default(0),
  serviceTax: integer("service_tax").notNull().default(0),
  total: integer("total").notNull().default(0),
  paid: integer("paid").notNull().default(0),
  balance: integer("balance").notNull().default(0),
  status: text("status").notNull().default("Final"),
  issuedAt: text("issued_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_invoices_reservation_id").on(table.reservationId),
  uniqueIndex("idx_invoices_invoice_no").on(table.invoiceNo),
  index("idx_invoices_issued_at").on(table.issuedAt),
]);

export const ratePlans = sqliteTable("rate_plans", {
  id: text("id").primaryKey(),
  roomKey: text("room_key").notNull(),
  roomName: text("room_name").notNull(),
  baseRate: integer("base_rate").notNull(),
  includedAdults: integer("included_adults").notNull().default(2),
  extraAdultRate: integer("extra_adult_rate").notNull().default(1500),
  childRate: integer("child_rate").notNull().default(800),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_rate_plans_room_key").on(table.roomKey)]);

export const seasonRules = sqliteTable("season_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  adjustmentPercent: integer("adjustment_percent").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_season_rules_dates_active").on(table.startDate, table.endDate, table.active)]);

export const paymentAccounts = sqliteTable("payment_accounts", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  displayName: text("display_name").notNull(),
  merchantId: text("merchant_id").notNull().default(""),
  keyId: text("key_id").notNull().default(""),
  upiId: text("upi_id").notNull().default(""),
  settlementAccountMask: text("settlement_account_mask").notNull().default(""),
  mode: text("mode").notNull().default("Test"),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedByEmail: text("updated_by_email").notNull().default(""),
}, (table) => [uniqueIndex("idx_payment_accounts_provider").on(table.provider)]);

export const staffUsers = sqliteTable("staff_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default("Front Desk"),
  status: text("status").notNull().default("Active"),
  createdByEmail: text("created_by_email").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_staff_users_email").on(table.email), index("idx_staff_users_role_status").on(table.role, table.status)]);

export const operationalTasks = sqliteTable("operational_tasks", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  unit: text("unit").notNull(),
  title: text("title").notNull(),
  priority: text("priority").notNull().default("Normal"),
  status: text("status").notNull().default("Open"),
  assignee: text("assignee").notNull().default(""),
  dueAt: text("due_at"),
  notes: text("notes").notNull().default(""),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_operational_tasks_type_status").on(table.type, table.status),
  index("idx_operational_tasks_unit").on(table.unit),
]);

export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_activity_logs_entity").on(table.entityType, table.entityId), index("idx_activity_logs_created_at").on(table.createdAt)]);

export const propertySettings = sqliteTable("property_settings", {
  id: text("id").primaryKey().default("primary"),
  propertyName: text("property_name").notNull().default("Cardamom Rock Resort"),
  currency: text("currency").notNull().default("INR"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  gstEnabled: integer("gst_enabled", { mode: "boolean" }).notNull().default(true),
  accommodationTaxRate: integer("accommodation_tax_rate").notNull().default(12),
  serviceTaxRate: integer("service_tax_rate").notNull().default(18),
  pricesIncludeTax: integer("prices_include_tax", { mode: "boolean" }).notNull().default(false),
  gstin: text("gstin").notNull().default(""),
  invoicePrefix: text("invoice_prefix").notNull().default("CRR"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedByEmail: text("updated_by_email").notNull().default(""),
});

export const accommodationUnits = sqliteTable("accommodation_units", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("Room"),
  parentId: text("parent_id"),
  capacityAdults: integer("capacity_adults").notNull().default(2),
  capacityChildren: integer("capacity_children").notNull().default(1),
  baseRate: integer("base_rate").notNull().default(0),
  housekeepingStatus: text("housekeeping_status").notNull().default("Ready"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_accommodation_units_name").on(table.name), index("idx_accommodation_units_parent").on(table.parentId)]);

export const resortServices = sqliteTable("resort_services", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("per booking"),
  price: integer("price").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  bookableOnline: integer("bookable_online", { mode: "boolean" }).notNull().default(false),
  approvalRequired: integer("approval_required", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_resort_services_name").on(table.name), index("idx_resort_services_category_active").on(table.category, table.active)]);

export const connectorConfigurations = sqliteTable("connector_configurations", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  provider: text("provider").notNull(),
  displayName: text("display_name").notNull(),
  mode: text("mode").notNull().default("Test"),
  status: text("status").notNull().default("Not configured"),
  baseUrl: text("base_url").notNull().default(""),
  accountId: text("account_id").notNull().default(""),
  propertyId: text("property_id").notNull().default(""),
  webhookPath: text("webhook_path").notNull().default(""),
  capabilitiesJson: text("capabilities_json").notNull().default("[]"),
  secretKeysJson: text("secret_keys_json").notNull().default("[]"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  lastCheckedAt: text("last_checked_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedByEmail: text("updated_by_email").notNull().default(""),
}, (table) => [uniqueIndex("idx_connector_provider").on(table.provider), index("idx_connector_category_status").on(table.category, table.status)]);

export const marketRateSnapshots = sqliteTable("market_rate_snapshots", {
  id: text("id").primaryKey(),
  propertyName: text("property_name").notNull(),
  stayDate: text("stay_date").notNull(),
  roomType: text("room_type").notNull().default("Comparable room"),
  rate: integer("rate").notNull(),
  source: text("source").notNull().default("Sample"),
  capturedAt: text("captured_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_market_rates_date_property").on(table.stayDate, table.propertyName)]);

export const aiRecommendations = sqliteTable("ai_recommendations", {
  id: text("id").primaryKey(),
  recommendationType: text("recommendation_type").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  rationaleJson: text("rationale_json").notNull().default("[]"),
  targetDate: text("target_date"),
  roomKey: text("room_key"),
  currentRate: integer("current_rate").notNull().default(0),
  proposedRate: integer("proposed_rate").notNull().default(0),
  promotionJson: text("promotion_json").notNull().default("{}"),
  audienceJson: text("audience_json").notNull().default("{}"),
  channelsJson: text("channels_json").notNull().default("[]"),
  confidence: integer("confidence").notNull().default(0),
  status: text("status").notNull().default("Proposed"),
  approvedByEmail: text("approved_by_email").notNull().default(""),
  approvedAt: text("approved_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_ai_recommendations_status_created").on(table.status, table.createdAt)]);

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  recommendationId: text("recommendation_id").references(() => aiRecommendations.id),
  name: text("name").notNull(),
  audienceJson: text("audience_json").notNull().default("{}"),
  channelsJson: text("channels_json").notNull().default("[]"),
  contentJson: text("content_json").notNull().default("{}"),
  status: text("status").notNull().default("Draft"),
  scheduledAt: text("scheduled_at"),
  approvedByEmail: text("approved_by_email").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_campaign_recommendation").on(table.recommendationId), index("idx_campaign_status_schedule").on(table.status, table.scheduledAt)]);
