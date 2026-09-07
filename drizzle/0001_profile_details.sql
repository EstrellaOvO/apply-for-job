CREATE TABLE `education_experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`school_name` text DEFAULT '' NOT NULL,
	`college_name` text DEFAULT '' NOT NULL,
	`major_name` text DEFAULT '' NOT NULL,
	`degree` text DEFAULT '' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`ranking` text DEFAULT '' NOT NULL,
	`full_time` integer DEFAULT true NOT NULL,
	`laboratory_level` text DEFAULT '' NOT NULL,
	`laboratory_name` text DEFAULT '' NOT NULL,
	`advisor` text DEFAULT '' NOT NULL,
	`research_direction` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_education_sort` ON `education_experiences` (`sort_order`);
--> statement-breakpoint
CREATE TABLE `language_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`language_type` text DEFAULT '' NOT NULL,
	`proficiency` text DEFAULT '' NOT NULL,
	`exam_name` text DEFAULT '' NOT NULL,
	`score` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_languages_sort` ON `language_skills` (`sort_order`);
--> statement-breakpoint
CREATE TABLE `internship_experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text DEFAULT '' NOT NULL,
	`department_name` text DEFAULT '' NOT NULL,
	`position` text DEFAULT '' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_internships_sort` ON `internship_experiences` (`sort_order`);
--> statement-breakpoint
CREATE TABLE `project_experiences` (
	`id` text PRIMARY KEY NOT NULL,
	`project_name` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'Agent开发' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`end_date` text DEFAULT '' NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_sort` ON `project_experiences` (`sort_order`);
