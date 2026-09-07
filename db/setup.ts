import { env } from 'cloudflare:workers';

const statements = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '', current_location TEXT NOT NULL DEFAULT '',
    years_experience TEXT NOT NULL DEFAULT '', target_roles TEXT NOT NULL DEFAULT '',
    preferred_locations TEXT NOT NULL DEFAULT '', expected_salary TEXT NOT NULL DEFAULT '',
    notice_period TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY, filename TEXT NOT NULL, object_key TEXT NOT NULL,
    raw_text TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY, company TEXT NOT NULL, title TEXT NOT NULL,
    location TEXT NOT NULL, source TEXT NOT NULL, url TEXT NOT NULL,
    match_score INTEGER NOT NULL DEFAULT 0, match_reasons TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'new', posted_at TEXT, discovered_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY, job_id TEXT, company TEXT NOT NULL, title TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft', applied_at TEXT, last_checked_at TEXT,
    next_action TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS answer_memory (
    id TEXT PRIMARY KEY, field_key TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
    value TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'global', updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS status_checks (
    id TEXT PRIMARY KEY, application_id TEXT NOT NULL, old_status TEXT NOT NULL,
    new_status TEXT NOT NULL, checked_at TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'manual'
  )`,
  `CREATE TABLE IF NOT EXISTS education_experiences (
    id TEXT PRIMARY KEY, school_name TEXT NOT NULL DEFAULT '', college_name TEXT NOT NULL DEFAULT '',
    major_name TEXT NOT NULL DEFAULT '', degree TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '',
    end_date TEXT NOT NULL DEFAULT '', ranking TEXT NOT NULL DEFAULT '', full_time INTEGER NOT NULL DEFAULT 1,
    laboratory_level TEXT NOT NULL DEFAULT '', laboratory_name TEXT NOT NULL DEFAULT '',
    advisor TEXT NOT NULL DEFAULT '', research_direction TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS language_skills (
    id TEXT PRIMARY KEY, language_type TEXT NOT NULL DEFAULT '', proficiency TEXT NOT NULL DEFAULT '',
    exam_name TEXT NOT NULL DEFAULT '', score TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS internship_experiences (
    id TEXT PRIMARY KEY, company_name TEXT NOT NULL DEFAULT '', department_name TEXT NOT NULL DEFAULT '',
    position TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '',
    is_current INTEGER NOT NULL DEFAULT 0, description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS project_experiences (
    id TEXT PRIMARY KEY, project_name TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT 'Agent开发',
    start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '', is_current INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_status_score ON jobs(status, match_score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status)`,
  `CREATE INDEX IF NOT EXISTS idx_checks_application_date ON status_checks(application_id, checked_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_education_sort ON education_experiences(sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_languages_sort ON language_skills(sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_internships_sort ON internship_experiences(sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_sort ON project_experiences(sort_order)`,
];

let ready: Promise<void> | undefined;

export function ensureDatabase() {
  if (!ready) {
    ready = (async () => {
      await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));
      await env.DB.prepare('PRAGMA optimize').run();
    })();
  }
  return ready;
}
