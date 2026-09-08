ALTER TABLE `jobs` ADD `description` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE INDEX `idx_jobs_url` ON `jobs` (`url`);
--> statement-breakpoint
CREATE INDEX `idx_applications_url` ON `applications` (`url`);
