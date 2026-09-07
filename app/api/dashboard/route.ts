import { env } from 'cloudflare:workers';
import { ensureDatabase } from '@/db/setup';
import type { EducationRecord, InternshipRecord, LanguageRecord, ProjectRecord } from '@/lib/profile-records';

const now = () => new Date().toISOString();

async function seedDemoData() {
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM jobs').first<{ count: number }>();
  if ((count?.count ?? 0) > 0) return;

  const discoveredAt = now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO jobs (id, company, title, location, source, url, match_score, match_reasons, status, posted_at, discovered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind('job-byte', '字节跳动', '产品经理 - AI 应用', '上海', '官方招聘', '', 91, '["AI 产品经验","地点匹配","行业经历相关"]', 'new', '2026-09-05', discoveredAt),
    env.DB.prepare(`INSERT INTO jobs (id, company, title, location, source, url, match_score, match_reasons, status, posted_at, discovered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind('job-tencent', '腾讯', '高级产品经理', '深圳', '官方招聘', '', 86, '["产品策略","跨团队协作"]', 'applied', '2026-09-04', discoveredAt),
    env.DB.prepare(`INSERT INTO jobs (id, company, title, location, source, url, match_score, match_reasons, status, posted_at, discovered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind('job-red', '小红书', '商业产品经理', '上海', '官方招聘', '', 83, '["商业化经验","地点匹配"]', 'applied', '2026-09-03', discoveredAt),
    env.DB.prepare(`INSERT INTO applications (id, job_id, company, title, location, url, status, applied_at, last_checked_at, next_action, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind('app-tencent', 'job-tencent', '腾讯', '高级产品经理', '深圳', '', 'assessment', '2026-09-02T09:30:00.000Z', discoveredAt, '9 月 10 日前完成在线笔试', ''),
    env.DB.prepare(`INSERT INTO applications (id, job_id, company, title, location, url, status, applied_at, last_checked_at, next_action, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind('app-red', 'job-red', '小红书', '商业产品经理', '上海', '', 'submitted', '2026-09-04T13:20:00.000Z', discoveredAt, '等待招聘方反馈', ''),
    env.DB.prepare(`INSERT OR IGNORE INTO profiles (id, name, target_roles, preferred_locations, updated_at)
      VALUES (?, ?, ?, ?, ?)`).bind('me', '', '产品经理, AI 产品经理', '上海, 深圳, 杭州', discoveredAt),
  ]);
}

export async function GET() {
  await ensureDatabase();
  await seedDemoData();

  const [profile, jobs, applications, memories, resumes, education, languages, internships, projects] = await Promise.all([
    env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind('me').first(),
    env.DB.prepare('SELECT * FROM jobs ORDER BY match_score DESC, discovered_at DESC').all(),
    env.DB.prepare('SELECT * FROM applications ORDER BY COALESCE(applied_at, last_checked_at) DESC').all(),
    env.DB.prepare('SELECT * FROM answer_memory ORDER BY updated_at DESC').all(),
    env.DB.prepare('SELECT id, filename, size, is_current, created_at FROM resumes ORDER BY created_at DESC').all(),
    env.DB.prepare('SELECT * FROM education_experiences ORDER BY sort_order, updated_at').all(),
    env.DB.prepare('SELECT * FROM language_skills ORDER BY sort_order, updated_at').all(),
    env.DB.prepare('SELECT * FROM internship_experiences ORDER BY sort_order, updated_at').all(),
    env.DB.prepare('SELECT * FROM project_experiences ORDER BY sort_order, updated_at').all(),
  ]);

  return Response.json({
    profile,
    jobs: jobs.results,
    applications: applications.results,
    memories: memories.results,
    resumes: resumes.results,
    education: education.results,
    languages: languages.results,
    internships: internships.results,
    projects: projects.results,
  });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json() as Record<string, unknown>;
  const type = String(body.type ?? '');

  if (type === 'save-profile') {
    const profile = (body.profile ?? {}) as Record<string, string>;
    await env.DB.prepare(`INSERT INTO profiles (
      id, name, email, phone, current_location, years_experience, target_roles,
      preferred_locations, expected_salary, notice_period, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, email=excluded.email, phone=excluded.phone,
      current_location=excluded.current_location, years_experience=excluded.years_experience,
      target_roles=excluded.target_roles, preferred_locations=excluded.preferred_locations,
      expected_salary=excluded.expected_salary, notice_period=excluded.notice_period,
      updated_at=excluded.updated_at`).bind(
        'me', profile.name ?? '', profile.email ?? '', profile.phone ?? '',
        profile.current_location ?? '', profile.years_experience ?? '', profile.target_roles ?? '',
        profile.preferred_locations ?? '', profile.expected_salary ?? '', profile.notice_period ?? '', now(),
      ).run();
    return Response.json({ ok: true });
  }

  if (type === 'save-profile-details') {
    const education = ((body.education ?? []) as EducationRecord[]).slice(0, 20);
    const languages = ((body.languages ?? []) as LanguageRecord[]).slice(0, 20);
    const internships = ((body.internships ?? []) as InternshipRecord[]).slice(0, 30);
    const projects = ((body.projects ?? []) as ProjectRecord[]).slice(0, 30);
    const updatedAt = now();
    const statements = [
      env.DB.prepare('DELETE FROM education_experiences'),
      env.DB.prepare('DELETE FROM language_skills'),
      env.DB.prepare('DELETE FROM internship_experiences'),
      env.DB.prepare('DELETE FROM project_experiences'),
      ...education.map((item, index) => env.DB.prepare(`INSERT INTO education_experiences (
        id, school_name, college_name, major_name, degree, start_date, end_date, ranking,
        full_time, laboratory_level, laboratory_name, advisor, research_direction, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || crypto.randomUUID(), item.school_name ?? '', item.college_name ?? '', item.major_name ?? '',
        item.degree ?? '', item.start_date ?? '', item.end_date ?? '', item.ranking ?? '', item.full_time ? 1 : 0,
        item.laboratory_level ?? '', item.laboratory_name ?? '', item.advisor ?? '', item.research_direction ?? '', index, updatedAt,
      )),
      ...languages.map((item, index) => env.DB.prepare(`INSERT INTO language_skills (
        id, language_type, proficiency, exam_name, score, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || crypto.randomUUID(), item.language_type ?? '', item.proficiency ?? '', item.exam_name ?? '', item.score ?? '', index, updatedAt,
      )),
      ...internships.map((item, index) => env.DB.prepare(`INSERT INTO internship_experiences (
        id, company_name, department_name, position, start_date, end_date, is_current, description, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || crypto.randomUUID(), item.company_name ?? '', item.department_name ?? '', item.position ?? '',
        item.start_date ?? '', item.end_date ?? '', item.is_current ? 1 : 0, item.description ?? '', index, updatedAt,
      )),
      ...projects.map((item, index) => env.DB.prepare(`INSERT INTO project_experiences (
        id, project_name, role, start_date, end_date, is_current, description, sort_order, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        item.id || crypto.randomUUID(), item.project_name ?? '', 'Agent开发', item.start_date ?? '',
        item.end_date ?? '', item.is_current ? 1 : 0, item.description ?? '', index, updatedAt,
      )),
    ];
    await env.DB.batch(statements);
    return Response.json({ ok: true });
  }

  if (type === 'remember-answer') {
    const fieldKey = String(body.fieldKey ?? '').trim();
    const label = String(body.label ?? '').trim();
    const value = String(body.value ?? '').trim();
    if (!fieldKey || !label || !value) return Response.json({ error: '字段和值不能为空' }, { status: 400 });
    await env.DB.prepare(`INSERT INTO answer_memory (id, field_key, label, value, scope, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(field_key) DO UPDATE SET label=excluded.label, value=excluded.value,
      scope=excluded.scope, updated_at=excluded.updated_at`).bind(
        crypto.randomUUID(), fieldKey, label, value, String(body.scope ?? 'global'), now(),
      ).run();
    return Response.json({ ok: true });
  }

  if (type === 'update-status') {
    const id = String(body.id ?? '');
    const status = String(body.status ?? '');
    const application = await env.DB.prepare('SELECT status FROM applications WHERE id = ?').bind(id).first<{ status: string }>();
    if (!application || !status) return Response.json({ error: '投递记录不存在' }, { status: 404 });
    const checkedAt = now();
    await env.DB.batch([
      env.DB.prepare('UPDATE applications SET status = ?, last_checked_at = ? WHERE id = ?').bind(status, checkedAt, id),
      env.DB.prepare('INSERT INTO status_checks (id, application_id, old_status, new_status, checked_at, source) VALUES (?, ?, ?, ?, ?, ?)').bind(crypto.randomUUID(), id, application.status, status, checkedAt, 'manual'),
    ]);
    return Response.json({ ok: true, checkedAt });
  }

  if (type === 'add-application') {
    const application = (body.application ?? {}) as Record<string, string>;
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO applications (id, company, title, location, url, status, applied_at, last_checked_at, next_action, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        id, application.company ?? '', application.title ?? '', application.location ?? '',
        application.url ?? '', application.status ?? 'draft', application.applied_at || null,
        now(), application.next_action ?? '', application.notes ?? '',
      ).run();
    return Response.json({ ok: true, id });
  }

  return Response.json({ error: '不支持的操作' }, { status: 400 });
}
