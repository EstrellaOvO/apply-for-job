import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    company: text('company').notNull(),
    title: text('title').notNull(),
    location: text('location').notNull(),
    source: text('source').notNull(),
    url: text('url').notNull(),
    description: text('description').notNull().default(''),
    matchScore: integer('match_score').notNull().default(0),
    matchReasons: text('match_reasons').notNull().default('[]'),
    status: text('status').notNull().default('new'),
    postedAt: text('posted_at'),
    discoveredAt: text('discovered_at').notNull(),
  },
  (table) => [index('idx_jobs_url').on(table.url)],
);

export const applications = sqliteTable(
  'applications',
  {
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
  },
  (table) => [index('idx_applications_url').on(table.url)],
);

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

export const educationExperiences = sqliteTable('education_experiences', {
  id: text('id').primaryKey(),
  schoolName: text('school_name').notNull().default(''),
  collegeName: text('college_name').notNull().default(''),
  majorName: text('major_name').notNull().default(''),
  degree: text('degree').notNull().default(''),
  startDate: text('start_date').notNull().default(''),
  endDate: text('end_date').notNull().default(''),
  ranking: text('ranking').notNull().default(''),
  fullTime: integer('full_time', { mode: 'boolean' }).notNull().default(true),
  laboratoryLevel: text('laboratory_level').notNull().default(''),
  laboratoryName: text('laboratory_name').notNull().default(''),
  advisor: text('advisor').notNull().default(''),
  researchDirection: text('research_direction').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const languageSkills = sqliteTable('language_skills', {
  id: text('id').primaryKey(),
  languageType: text('language_type').notNull().default(''),
  proficiency: text('proficiency').notNull().default(''),
  examName: text('exam_name').notNull().default(''),
  score: text('score').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const internshipExperiences = sqliteTable('internship_experiences', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull().default(''),
  departmentName: text('department_name').notNull().default(''),
  position: text('position').notNull().default(''),
  startDate: text('start_date').notNull().default(''),
  endDate: text('end_date').notNull().default(''),
  isCurrent: integer('is_current', { mode: 'boolean' })
    .notNull()
    .default(false),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export const projectExperiences = sqliteTable('project_experiences', {
  id: text('id').primaryKey(),
  projectName: text('project_name').notNull().default(''),
  role: text('role').notNull().default('Agent开发'),
  startDate: text('start_date').notNull().default(''),
  endDate: text('end_date').notNull().default(''),
  isCurrent: integer('is_current', { mode: 'boolean' })
    .notNull()
    .default(false),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
