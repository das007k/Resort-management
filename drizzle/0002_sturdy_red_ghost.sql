CREATE TABLE `payment_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`display_name` text NOT NULL,
	`merchant_id` text DEFAULT '' NOT NULL,
	`key_id` text DEFAULT '' NOT NULL,
	`upi_id` text DEFAULT '' NOT NULL,
	`settlement_account_mask` text DEFAULT '' NOT NULL,
	`mode` text DEFAULT 'Test' NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by_email` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_accounts_provider` ON `payment_accounts` (`provider`);--> statement-breakpoint
CREATE TABLE `rate_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`room_key` text NOT NULL,
	`room_name` text NOT NULL,
	`base_rate` integer NOT NULL,
	`included_adults` integer DEFAULT 2 NOT NULL,
	`extra_adult_rate` integer DEFAULT 1500 NOT NULL,
	`child_rate` integer DEFAULT 800 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_rate_plans_room_key` ON `rate_plans` (`room_key`);--> statement-breakpoint
CREATE TABLE `season_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`adjustment_percent` integer DEFAULT 0 NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_season_rules_dates_active` ON `season_rules` (`start_date`,`end_date`,`active`);--> statement-breakpoint
CREATE TABLE `staff_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'Front Desk' NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_by_email` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_staff_users_email` ON `staff_users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_staff_users_role_status` ON `staff_users` (`role`,`status`);