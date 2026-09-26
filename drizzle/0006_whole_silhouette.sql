CREATE TABLE `ai_recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`recommendation_type` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`rationale_json` text DEFAULT '[]' NOT NULL,
	`target_date` text,
	`room_key` text,
	`current_rate` integer DEFAULT 0 NOT NULL,
	`proposed_rate` integer DEFAULT 0 NOT NULL,
	`promotion_json` text DEFAULT '{}' NOT NULL,
	`audience_json` text DEFAULT '{}' NOT NULL,
	`channels_json` text DEFAULT '[]' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Proposed' NOT NULL,
	`approved_by_email` text DEFAULT '' NOT NULL,
	`approved_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_recommendations_status_created` ON `ai_recommendations` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`recommendation_id` text,
	`name` text NOT NULL,
	`audience_json` text DEFAULT '{}' NOT NULL,
	`channels_json` text DEFAULT '[]' NOT NULL,
	`content_json` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`scheduled_at` text,
	`approved_by_email` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`recommendation_id`) REFERENCES `ai_recommendations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_campaign_recommendation` ON `campaigns` (`recommendation_id`);--> statement-breakpoint
CREATE INDEX `idx_campaign_status_schedule` ON `campaigns` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE TABLE `market_rate_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`property_name` text NOT NULL,
	`stay_date` text NOT NULL,
	`room_type` text DEFAULT 'Comparable room' NOT NULL,
	`rate` integer NOT NULL,
	`source` text DEFAULT 'Sample' NOT NULL,
	`captured_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_market_rates_date_property` ON `market_rate_snapshots` (`stay_date`,`property_name`);