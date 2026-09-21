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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_reservations_quote_id").on(table.quoteId),
  index("idx_reservations_status_check_in").on(table.status, table.checkIn),
]);

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
