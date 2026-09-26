CREATE TABLE `connector_configurations` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`provider` text NOT NULL,
	`display_name` text NOT NULL,
	`mode` text DEFAULT 'Test' NOT NULL,
	`status` text DEFAULT 'Not configured' NOT NULL,
	`base_url` text DEFAULT '' NOT NULL,
	`account_id` text DEFAULT '' NOT NULL,
	`property_id` text DEFAULT '' NOT NULL,
	`webhook_path` text DEFAULT '' NOT NULL,
	`capabilities_json` text DEFAULT '[]' NOT NULL,
	`secret_keys_json` text DEFAULT '[]' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`last_checked_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_by_email` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_connector_provider` ON `connector_configurations` (`provider`);--> statement-breakpoint
CREATE INDEX `idx_connector_category_status` ON `connector_configurations` (`category`,`status`);