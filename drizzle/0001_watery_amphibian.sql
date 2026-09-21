CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` text NOT NULL,
	`invoice_no` text NOT NULL,
	`guest` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`items_json` text DEFAULT '[]' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`accommodation_tax` integer DEFAULT 0 NOT NULL,
	`service_tax` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`paid` integer DEFAULT 0 NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Final' NOT NULL,
	`issued_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invoices_reservation_id` ON `invoices` (`reservation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_invoices_invoice_no` ON `invoices` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `idx_invoices_issued_at` ON `invoices` (`issued_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` text NOT NULL,
	`reference` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text DEFAULT 'Payment link' NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`paid_at` text,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_reference` ON `payments` (`reference`);--> statement-breakpoint
CREATE INDEX `idx_payments_reservation_status` ON `payments` (`reservation_id`,`status`);--> statement-breakpoint
ALTER TABLE `quotes` ADD `accommodation_tax` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `quotes` ADD `service_tax` integer DEFAULT 0 NOT NULL;