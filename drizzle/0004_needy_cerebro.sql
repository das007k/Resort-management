CREATE TABLE `accommodation_units` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'Room' NOT NULL,
	`parent_id` text,
	`capacity_adults` integer DEFAULT 2 NOT NULL,
	`capacity_children` integer DEFAULT 1 NOT NULL,
	`base_rate` integer DEFAULT 0 NOT NULL,
	`housekeeping_status` text DEFAULT 'Ready' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_accommodation_units_name` ON `accommodation_units` (`name`);--> statement-breakpoint
CREATE INDEX `idx_accommodation_units_parent` ON `accommodation_units` (`parent_id`);--> statement-breakpoint
CREATE TABLE `property_settings` (
	`id` text PRIMARY KEY DEFAULT 'primary' NOT NULL,
	`property_name` text DEFAULT 'Cardamom Rock Resort' NOT NULL,
	`currency` text DEFAULT 'INR' NOT NULL,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`gst_enabled` integer DEFAULT true NOT NULL,
	`accommodation_tax_rate` integer DEFAULT 12 NOT NULL,
	`service_tax_rate` integer DEFAULT 18 NOT NULL,
	`prices_include_tax` integer DEFAULT false NOT NULL,
	`gstin` text DEFAULT '' NOT NULL,
	`invoice_prefix` text DEFAULT 'CRR' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by_email` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resort_services` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`unit` text DEFAULT 'per booking' NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`bookable_online` integer DEFAULT false NOT NULL,
	`approval_required` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_resort_services_name` ON `resort_services` (`name`);--> statement-breakpoint
CREATE INDEX `idx_resort_services_category_active` ON `resort_services` (`category`,`active`);