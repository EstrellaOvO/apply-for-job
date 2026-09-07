import { env } from 'cloudflare:workers';
import { ensureDatabase } from '@/db/setup';
import type { InternshipRecord, ProjectRecord } from '@/lib/profile-records';

export async function POST(request: Request) {
  await ensureDatabase();
  const form = await request.formData();
  const file = form.get('file');
  const rawText = String(form.get('rawText') ?? '').slice(0, 250_000);
  const parsedProfile = JSON.parse(String(form.get('profile') ?? '{}')) as Record<string, string>;
  const parsedInternships = JSON.parse(String(form.get('internships') ?? '[]')) as InternshipRecord[];
  const parsedProjects = JSON.parse(String(form.get('projects') ?? '[]')) as ProjectRecord[];

  if (!(file instanceof File) || file.type !== 'application/pdf') {
    return Response.json({ error: '请上传 PDF 格式的简历' }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return Response.json({ error: 'PDF 不能超过 10MB' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const objectKey = `resumes/${id}.pdf`;
  const createdAt = new Date().toISOString();
  await env.FILES.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { filename: file.name },
  });

  const statements = [
    env.DB.prepare('UPDATE resumes SET is_current = 0 WHERE is_current = 1'),
    env.DB.prepare(`INSERT INTO resumes (id, filename, object_key, raw_text, size, is_current, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)`).bind(id, file.name, objectKey, rawText, file.size, createdAt),
    env.DB.prepare(`INSERT INTO profiles (
      id, name, email, phone, current_location, years_experience, target_roles,
      preferred_locations, expected_salary, notice_period, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=CASE WHEN excluded.name != '' THEN excluded.name ELSE profiles.name END,
      email=CASE WHEN excluded.email != '' THEN excluded.email ELSE profiles.email END,
      phone=CASE WHEN excluded.phone != '' THEN excluded.phone ELSE profiles.phone END,
      current_location=CASE WHEN excluded.current_location != '' THEN excluded.current_location ELSE profiles.current_location END,
      updated_at=excluded.updated_at`).bind(
        'me', parsedProfile.name ?? '', parsedProfile.email ?? '', parsedProfile.phone ?? '',
        parsedProfile.current_location ?? '', '', '', '', '', '', createdAt,
      ),
  ];

  if (parsedInternships.length > 0) {
    statements.push(env.DB.prepare('DELETE FROM internship_experiences'));
    statements.push(...parsedInternships.slice(0, 30).map((item, index) => env.DB.prepare(`INSERT INTO internship_experiences (
      id, company_name, department_name, position, start_date, end_date, is_current, description, sort_order, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      crypto.randomUUID(), item.company_name ?? '', item.department_name ?? '', item.position ?? '', item.start_date ?? '',
      item.end_date ?? '', item.is_current ? 1 : 0, item.description ?? '', index, createdAt,
    )));
  }
  if (parsedProjects.length > 0) {
    statements.push(env.DB.prepare('DELETE FROM project_experiences'));
    statements.push(...parsedProjects.slice(0, 30).map((item, index) => env.DB.prepare(`INSERT INTO project_experiences (
      id, project_name, role, start_date, end_date, is_current, description, sort_order, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      crypto.randomUUID(), item.project_name ?? '', 'Agent开发', item.start_date ?? '', item.end_date ?? '',
      item.is_current ? 1 : 0, item.description ?? '', index, createdAt,
    )));
  }
  await env.DB.batch(statements);

  return Response.json({ ok: true, resume: { id, filename: file.name, size: file.size, is_current: 1, created_at: createdAt } });
}
