import { env } from 'cloudflare:workers';
import { ensureDatabase } from '@/db/setup';

export async function POST(request: Request) {
  await ensureDatabase();
  const form = await request.formData();
  const file = form.get('file');
  const rawText = String(form.get('rawText') ?? '').slice(0, 250_000);
  const parsedProfile = JSON.parse(String(form.get('profile') ?? '{}')) as Record<string, string>;

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

  await env.DB.batch([
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
  ]);

  return Response.json({ ok: true, resume: { id, filename: file.name, size: file.size, is_current: 1, created_at: createdAt } });
}
