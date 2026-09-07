import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  currentLocation: text('current_location').notNull().default(''),
  yearsExperience: text('years_experience').notNull().default(''),
  targetRoles: text('target_roles').notNull().default(''),
  preferredLocations: text('preferred_locations').notNull().default(''),
  expectedSalary: text('expected_salary').notNull().default(''),
  noticePeriod: text('notice_period').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
});

export const resumes = sqliteTable('resumes', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  objectKey: text('object_key').notNull(),
  rawText: text('raw_text').notNull().default(''),
  size: integer('size').notNull(),
  isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
});

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  company: text('company').notNull(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  source: text('source').notNull(),
  url: text('url').notNull(),
  matchScore: integer('match_score').notNull().default(0),
  matchReasons: text('match_reasons').notNull().default('[]'),
  status: text('status').notNull().default('new'),
  postedAt: text('posted_at'),
  discoveredAt: text('discovered_at').notNull(),
});

export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  jobId: text('job_id'),
  company: text('company').notNull(),
  title: text('title').notNull(),
  location: text('location').notNull().default(''),
  url: text('url').notNull().default(''),
  status: text('status').notNull().default('draft'),
  appliedAt: text('applied_at'),
  lastCheckedAt: text('last_checked_at'),
  nextAction: text('next_action').notNull().default(''),
  notes: text('notes').notNull().default(''),
});

export const answerMemory = sqliteTable('answer_memory', {
  id: text('id').primaryKey(),
  fieldKey: text('field_key').notNull().unique(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  scope: text('scope').notNull().default('global'),
  updatedAt: text('updated_at').notNull(),
});

export const statusChecks = sqliteTable('status_checks', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull(),
  oldStatus: text('old_status').notNull(),
  newStatus: text('new_status').notNull(),
  checkedAt: text('checked_at').notNull(),
  source: text('source').notNull().default('manual'),
});
