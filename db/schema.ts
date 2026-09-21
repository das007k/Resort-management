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
