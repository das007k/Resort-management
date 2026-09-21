CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_no` text NOT NULL,
	`guest` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`unit` text NOT NULL,
	`adults` integer DEFAULT 1 NOT NULL,
	`older_children` integer DEFAULT 0 NOT NULL,
	`young_children` integer DEFAULT 0 NOT NULL,
	`meal_plan` text DEFAULT 'Room only' NOT NULL,
	`services_json` text DEFAULT '[]' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quotes_quote_no` ON `quotes` (`quote_no`);--> statement-breakpoint
CREATE INDEX `idx_quotes_status_created_at` ON `quotes` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text,
	`guest` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`unit` text NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`source` text DEFAULT 'Direct' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservations_quote_id` ON `reservations` (`quote_id`);--> statement-breakpoint
CREATE INDEX `idx_reservations_status_check_in` ON `reservations` (`status`,`check_in`);