CREATE TABLE `reservation_events` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` text NOT NULL,
	`event_type` text NOT NULL,
	`source` text DEFAULT 'StayAxis' NOT NULL,
	`external_event_id` text DEFAULT '' NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`acknowledgement_status` text DEFAULT 'Not required' NOT NULL,
	`processed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_by_email` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_reservation_events_reservation` ON `reservation_events` (`reservation_id`,`processed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservation_events_external` ON `reservation_events` (`source`,`external_event_id`);--> statement-breakpoint
ALTER TABLE `reservations` ADD `channel_reservation_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `channel_status` text DEFAULT 'New' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `acknowledgement_status` text DEFAULT 'Not required' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `guest_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `guest_country` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `adults` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `children` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `children_ages_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `rate_plan` text DEFAULT 'Standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `meal_plan` text DEFAULT 'Room only' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `currency` text DEFAULT 'INR' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `taxes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `fees` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `commission` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `payment_model` text DEFAULT 'Pay at property' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `guarantee_status` text DEFAULT 'Not guaranteed' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `cancellation_policy` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `cancellation_deadline` text;--> statement-breakpoint
ALTER TABLE `reservations` ADD `special_requests` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservations` ADD `arrival_time` text;--> statement-breakpoint
ALTER TABLE `reservations` ADD `last_modified_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;