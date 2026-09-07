CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`current_location` text DEFAULT '' NOT NULL,
	`years_experience` text DEFAULT '' NOT NULL,
	`target_roles` text DEFAULT '' NOT NULL,
	`preferred_locations` text DEFAULT '' NOT NULL,
	`expected_salary` text DEFAULT '' NOT NULL,
	`notice_period` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`object_key` text NOT NULL,
	`raw_text` text DEFAULT '' NOT NULL,
	`size` integer NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`location` text NOT NULL,
	`source` text NOT NULL,
	`url` text NOT NULL,
	`match_score` integer DEFAULT 0 NOT NULL,
	`match_reasons` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`posted_at` text,
	`discovered_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`applied_at` text,
	`last_checked_at` text,
	`next_action` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `answer_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`field_key` text NOT NULL,
	`label` text NOT NULL,
	`value` text NOT NULL,
	`scope` text DEFAULT 'global' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_memory_field_key_unique` ON `answer_memory` (`field_key`);
--> statement-breakpoint
CREATE TABLE `status_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`old_status` text NOT NULL,
	`new_status` text NOT NULL,
	`checked_at` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_status_score` ON `jobs` (`status`, `match_score`);
--> statement-breakpoint
CREATE INDEX `idx_applications_status` ON `applications` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_checks_application_date` ON `status_checks` (`application_id`, `checked_at`);
