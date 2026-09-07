'use client';

import { useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  GraduationCap,
  LanguagesIcon,
  LoaderCircle,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  emptyEducation,
  emptyInternship,
  emptyLanguage,
  emptyProject,
  type EducationRecord,
  type InternshipRecord,
  type LanguageRecord,
  type ProfileDetails,
  type ProjectRecord,
} from '@/lib/profile-records';

export type BasicProfile = {
  name: string;
  email: string;
  phone: string;
  current_location: string;
  years_experience: string;
  target_roles: string;
  preferred_locations: string;
  expected_salary: string;
  notice_period: string;
};

type Resume = {
  id: string;
  filename: string;
  size: number;
  is_current: number;
  created_at: string;
};
type Memory = {
  id: string;
  field_key: string;
  label: string;
  value: string;
  updated_at: string;
};

type Props = ProfileDetails & {
  profile: BasicProfile;
  setProfile: (profile: BasicProfile) => void;
  resumes: Resume[];
  memories: Memory[];
  busy: boolean;
  onSave: (details: ProfileDetails) => void;
  onImport: () => void;
};

const fieldClass = 'space-y-1.5 text-xs font-medium';
const required = <span className="text-destructive"> *</span>;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(
    new Date(value),
  );

function SectionHeader({
  icon: Icon,
  title,
  description,
  onAdd,
  addLabel,
}: {
  icon: typeof GraduationCap;
  title: string;
  description: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <CardHeader className="flex-row items-center gap-3 border-b border-border/70 py-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <CardTitle>{title}</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus />
        {addLabel}
      </Button>
    </CardHeader>
  );
}

function EmptyRecord({ text, onAdd }: { text: string; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="grid min-h-28 w-full place-items-center rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-center text-xs text-muted-foreground transition hover:border-primary/35 hover:bg-secondary/60"
    >
      <span>
        <Plus className="mx-auto mb-2 size-5" />
        {text}
      </span>
    </button>
  );
}

function MonthRange({
  start,
  end,
  current,
  onStart,
  onEnd,
  onCurrent,
  allowCurrent = true,
}: {
  start: string;
  end: string;
  current: boolean;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  onCurrent: (value: boolean) => void;
  allowCurrent?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="min-w-[130px] flex-1"
        type="month"
        value={start}
        onChange={(event) => onStart(event.target.value)}
      />
      <span className="text-muted-foreground">—</span>
      <Input
        className="min-w-[130px] flex-1"
        type="month"
        value={end}
        disabled={current}
        onChange={(event) => onEnd(event.target.value)}
      />
      {allowCurrent && (
        <label className="flex shrink-0 items-center gap-2 text-xs font-normal">
          <Checkbox
            checked={current}
            onCheckedChange={(checked) => onCurrent(Boolean(checked))}
          />
          至今
        </label>
      )}
    </div>
  );
}

export function ProfileView({
  profile,
  setProfile,
  resumes,
  memories,
  busy,
  onSave,
  onImport,
  education: initialEducation,
  languages: initialLanguages,
  internships: initialInternships,
  projects: initialProjects,
}: Props) {
  const [education, setEducation] =
    useState<EducationRecord[]>(initialEducation);
  const [languages, setLanguages] =
    useState<LanguageRecord[]>(initialLanguages);
  const [internships, setInternships] =
    useState<InternshipRecord[]>(initialInternships);
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [error, setError] = useState('');

  useEffect(() => setEducation(initialEducation), [initialEducation]);
  useEffect(() => setLanguages(initialLanguages), [initialLanguages]);
  useEffect(() => setInternships(initialInternships), [initialInternships]);
  useEffect(() => setProjects(initialProjects), [initialProjects]);

  const updateEducation = (id: string, patch: Partial<EducationRecord>) =>
    setEducation((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const updateLanguage = (id: string, patch: Partial<LanguageRecord>) =>
    setLanguages((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const updateInternship = (id: string, patch: Partial<InternshipRecord>) =>
    setInternships((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  const updateProject = (id: string, patch: Partial<ProjectRecord>) =>
    setProjects((items) =>
      items.map((item) =>
        item.id === id ? { ...item, ...patch, role: 'Agent开发' } : item,
      ),
    );

  const save = () => {
    const invalidEducation = education.some(
      (item) =>
        !item.school_name.trim() ||
        !item.college_name.trim() ||
        !item.major_name.trim() ||
        !item.degree ||
        !item.start_date ||
        !item.end_date,
    );
    const invalidLanguage = languages.some(
      (item) =>
        !item.language_type.trim() ||
        !item.proficiency.trim() ||
        !item.exam_name.trim() ||
        !item.score.trim(),
    );
    const invalidInternship = internships.some(
      (item) =>
        !item.company_name.trim() ||
        !item.position.trim() ||
        !item.start_date ||
        (!item.is_current && !item.end_date),
    );
    const invalidProject = projects.some(
      (item) =>
        !item.project_name.trim() ||
        !item.start_date ||
        (!item.is_current && !item.end_date),
    );
    if (
      invalidEducation ||
      invalidLanguage ||
      invalidInternship ||
      invalidProject
    ) {
      setError('请补全各部分带 * 的字段后再保存。');
      return;
    }
    setError('');
    onSave({ education, languages, internships, projects });
  };

  const basicInputs: Array<[keyof BasicProfile, string, string]> = [
    ['name', '姓名', '你的姓名'],
    ['email', '邮箱', 'name@example.com'],
    ['phone', '手机号', '用于申请联系'],
    ['current_location', '当前所在地', '例如：上海'],
    ['years_experience', '工作年限', '例如：5 年'],
    ['target_roles', '目标岗位', '多个方向用逗号分隔'],
    ['preferred_locations', '地点偏好', '例如：上海, 杭州'],
    ['expected_salary', '期望薪资', '例如：30-35K × 15 薪'],
    ['notice_period', '到岗时间', '例如：一个月内'],
  ];

  return (
    <div className="mt-6 space-y-6 pb-24">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="gap-0 border-0 shadow-none ring-border/80">
          <CardHeader className="border-b border-border/70 py-4">
            <div className="flex items-center gap-2">
              <CardTitle>标准个人资料</CardTitle>
              <Badge className="border-0 bg-primary/10 text-primary">
                <ShieldCheck />
                可信来源
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              网页中保存的资料优先于原始 PDF，后续填写申请表以这里的内容为准。
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
            {basicInputs.map(([key, label, placeholder]) => (
              <label key={key} className={fieldClass}>
                {label}
                <Input
                  value={profile[key]}
                  onChange={(event) =>
                    setProfile({ ...profile, [key]: event.target.value })
                  }
                  placeholder={placeholder}
                />
              </label>
            ))}
          </CardContent>
        </Card>
        <aside className="space-y-4">
          <Card className="gap-3 border-0 shadow-none ring-border/80">
            <CardHeader className="flex-row items-center justify-between pb-0">
              <CardTitle>简历版本</CardTitle>
              <Button variant="ghost" size="sm" onClick={onImport}>
                <Plus />
                导入
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumes.length ? (
                resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center gap-3 rounded-lg bg-secondary/65 p-3"
                  >
                    <FileText className="size-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {resume.filename}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {(resume.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                        {formatDate(resume.created_at)}
                      </p>
                    </div>
                    {resume.is_current ? (
                      <Badge className="border-0 bg-primary/10 text-primary">
                        当前
                      </Badge>
                    ) : null}
                  </div>
                ))
              ) : (
                <button
                  onClick={onImport}
                  className="w-full rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground"
                >
                  <UploadCloud className="mx-auto mb-2 size-5" />
                  导入第一份 PDF 简历
                </button>
              )}
            </CardContent>
          </Card>
          <Card className="gap-3 border-0 shadow-none ring-border/80">
            <CardHeader className="pb-0">
              <CardTitle>已记住的补充答案</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {memories.length ? (
                memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="rounded-lg border border-border/70 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{memory.label}</p>
                      <span className="text-[10px] text-muted-foreground">
                        自动填写
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {memory.value}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg bg-secondary/65 p-4 text-xs leading-5 text-muted-foreground">
                  申请时遇到陌生字段，回答会保存在这里。
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Card className="gap-0 border-0 shadow-none ring-border/80">
        <SectionHeader
          icon={GraduationCap}
          title="教育经历"
          description="完整记录大学及以上教育信息，支持多段经历。"
          addLabel="添加教育经历"
          onAdd={() => setEducation((items) => [...items, emptyEducation()])}
        />
        <CardContent className="space-y-4 py-5">
          {education.length ? (
            education.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl bg-secondary/45 p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">教育经历 {index + 1}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setEducation((items) =>
                        items.filter((record) => record.id !== item.id),
                      )
                    }
                  >
                    <Trash2 />
                    删除
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={fieldClass}>
                    学校名称{required}
                    <Input
                      value={item.school_name}
                      onChange={(e) =>
                        updateEducation(item.id, {
                          school_name: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    学院名称{required}
                    <Input
                      value={item.college_name}
                      onChange={(e) =>
                        updateEducation(item.id, {
                          college_name: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    专业名称{required}
                    <Input
                      value={item.major_name}
                      onChange={(e) =>
                        updateEducation(item.id, { major_name: e.target.value })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    学历{required}
                    <NativeSelect
                      className="w-full"
                      value={item.degree}
                      onChange={(e) =>
                        updateEducation(item.id, { degree: e.target.value })
                      }
                    >
                      <NativeSelectOption value="">请选择</NativeSelectOption>
                      <NativeSelectOption value="大学本科">
                        大学本科
                      </NativeSelectOption>
                      <NativeSelectOption value="硕士研究生">
                        硕士研究生
                      </NativeSelectOption>
                      <NativeSelectOption value="博士研究生">
                        博士研究生
                      </NativeSelectOption>
                      <NativeSelectOption value="其他">其他</NativeSelectOption>
                    </NativeSelect>
                  </label>
                  <label className={fieldClass}>
                    在校时间{required}
                    <MonthRange
                      start={item.start_date}
                      end={item.end_date}
                      current={false}
                      allowCurrent={false}
                      onStart={(value) =>
                        updateEducation(item.id, { start_date: value })
                      }
                      onEnd={(value) =>
                        updateEducation(item.id, { end_date: value })
                      }
                      onCurrent={() => {}}
                    />
                  </label>
                  <label className={fieldClass}>
                    成绩排名
                    <Input
                      value={item.ranking}
                      onChange={(e) =>
                        updateEducation(item.id, { ranking: e.target.value })
                      }
                      placeholder="例如：前 10% / 其他"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <Checkbox
                      checked={item.full_time}
                      onCheckedChange={(checked) =>
                        updateEducation(item.id, {
                          full_time: Boolean(checked),
                        })
                      }
                    />
                    全日制
                  </label>
                  <div />
                  <label className={fieldClass}>
                    实验室级别
                    <Input
                      value={item.laboratory_level}
                      onChange={(e) =>
                        updateEducation(item.id, {
                          laboratory_level: e.target.value,
                        })
                      }
                      placeholder="例如：省部级 / 无"
                    />
                  </label>
                  <label className={fieldClass}>
                    实验室名称
                    <Input
                      value={item.laboratory_name}
                      onChange={(e) =>
                        updateEducation(item.id, {
                          laboratory_name: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    导师
                    <Input
                      value={item.advisor}
                      onChange={(e) =>
                        updateEducation(item.id, { advisor: e.target.value })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    研究方向
                    <Input
                      value={item.research_direction}
                      onChange={(e) =>
                        updateEducation(item.id, {
                          research_direction: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            ))
          ) : (
            <EmptyRecord
              text="添加学校、专业、学历与研究信息"
              onAdd={() => setEducation([emptyEducation()])}
            />
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 border-0 shadow-none ring-border/80">
        <SectionHeader
          icon={LanguagesIcon}
          title="语言水平"
          description="记录语言熟练度、考试类型和成绩。"
          addLabel="添加语言"
          onAdd={() => setLanguages((items) => [...items, emptyLanguage()])}
        />
        <CardContent className="space-y-4 py-5">
          {languages.length ? (
            languages.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl bg-secondary/45 p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold">语言 {index + 1}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setLanguages((items) =>
                        items.filter((record) => record.id !== item.id),
                      )
                    }
                  >
                    <Trash2 />
                    删除
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={fieldClass}>
                    语言类型{required}
                    <Input
                      value={item.language_type}
                      onChange={(e) =>
                        updateLanguage(item.id, {
                          language_type: e.target.value,
                        })
                      }
                      placeholder="例如：英语"
                    />
                  </label>
                  <label className={fieldClass}>
                    语言水平{required}
                    <Input
                      value={item.proficiency}
                      onChange={(e) =>
                        updateLanguage(item.id, { proficiency: e.target.value })
                      }
                      placeholder="例如：日常会话"
                    />
                  </label>
                  <label className={fieldClass}>
                    语言考试{required}
                    <Input
                      value={item.exam_name}
                      onChange={(e) =>
                        updateLanguage(item.id, { exam_name: e.target.value })
                      }
                      placeholder="例如：CET-6"
                    />
                  </label>
                  <label className={fieldClass}>
                    考试分数{required}
                    <Input
                      value={item.score}
                      onChange={(e) =>
                        updateLanguage(item.id, { score: e.target.value })
                      }
                      placeholder="例如：516"
                    />
                  </label>
                </div>
              </div>
            ))
          ) : (
            <EmptyRecord
              text="添加语言能力与考试成绩"
              onAdd={() => setLanguages([emptyLanguage()])}
            />
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 border-0 shadow-none ring-border/80">
        <SectionHeader
          icon={BriefcaseBusiness}
          title="工作 / 实习经历"
          description="从 PDF 自动提取后可在此修订，保存结果将用于后续表单。"
          addLabel="添加实习"
          onAdd={() => setInternships((items) => [...items, emptyInternship()])}
        />
        <CardContent className="space-y-4 py-5">
          {internships.length ? (
            internships.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl bg-secondary/45 p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      实习经历 {index + 1}
                    </p>
                    {item.company_name && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {item.company_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setInternships((items) =>
                        items.filter((record) => record.id !== item.id),
                      )
                    }
                  >
                    <Trash2 />
                    删除
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={fieldClass}>
                    公司名称{required}
                    <Input
                      value={item.company_name}
                      onChange={(e) =>
                        updateInternship(item.id, {
                          company_name: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    部门名称
                    <Input
                      value={item.department_name}
                      onChange={(e) =>
                        updateInternship(item.id, {
                          department_name: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    职位{required}
                    <Input
                      value={item.position}
                      onChange={(e) =>
                        updateInternship(item.id, { position: e.target.value })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    在职时间{required}
                    <MonthRange
                      start={item.start_date}
                      end={item.end_date}
                      current={item.is_current}
                      onStart={(value) =>
                        updateInternship(item.id, { start_date: value })
                      }
                      onEnd={(value) =>
                        updateInternship(item.id, { end_date: value })
                      }
                      onCurrent={(value) =>
                        updateInternship(item.id, {
                          is_current: value,
                          end_date: value ? '' : item.end_date,
                        })
                      }
                    />
                  </label>
                  <label className={`${fieldClass} md:col-span-2`}>
                    工作描述
                    <Textarea
                      className="min-h-36"
                      value={item.description}
                      onChange={(e) =>
                        updateInternship(item.id, {
                          description: e.target.value,
                        })
                      }
                      placeholder="建议使用要点描述职责、技术和成果"
                    />
                  </label>
                </div>
              </div>
            ))
          ) : (
            <EmptyRecord
              text="导入 PDF 后将自动显示实习经历，也可手动添加"
              onAdd={() => setInternships([emptyInternship()])}
            />
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 border-0 shadow-none ring-border/80">
        <SectionHeader
          icon={FolderKanban}
          title="项目经历"
          description="项目角色统一为 Agent开发，其他字段可从 PDF 提取并修改。"
          addLabel="添加项目"
          onAdd={() => setProjects((items) => [...items, emptyProject()])}
        />
        <CardContent className="space-y-4 py-5">
          {projects.length ? (
            projects.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl bg-secondary/45 p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      项目经历 {index + 1}
                    </p>
                    {item.project_name && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {item.project_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() =>
                      setProjects((items) =>
                        items.filter((record) => record.id !== item.id),
                      )
                    }
                  >
                    <Trash2 />
                    删除
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className={fieldClass}>
                    项目名称{required}
                    <Input
                      value={item.project_name}
                      onChange={(e) =>
                        updateProject(item.id, { project_name: e.target.value })
                      }
                    />
                  </label>
                  <label className={fieldClass}>
                    项目角色{required}
                    <div className="relative">
                      <Input className="pr-9" readOnly value="Agent开发" />
                      <LockKeyhole className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </label>
                  <label className={fieldClass}>
                    项目时间{required}
                    <MonthRange
                      start={item.start_date}
                      end={item.end_date}
                      current={item.is_current}
                      onStart={(value) =>
                        updateProject(item.id, { start_date: value })
                      }
                      onEnd={(value) =>
                        updateProject(item.id, { end_date: value })
                      }
                      onCurrent={(value) =>
                        updateProject(item.id, {
                          is_current: value,
                          end_date: value ? '' : item.end_date,
                        })
                      }
                    />
                  </label>
                  <div />
                  <label className={`${fieldClass} md:col-span-2`}>
                    项目描述
                    <Textarea
                      className="min-h-36"
                      value={item.description}
                      onChange={(e) =>
                        updateProject(item.id, { description: e.target.value })
                      }
                      placeholder="描述项目目标、技术栈、职责和成果"
                    />
                  </label>
                </div>
              </div>
            ))
          ) : (
            <EmptyRecord
              text="导入 PDF 后将自动显示项目经历，也可手动添加"
              onAdd={() => setProjects([emptyProject()])}
            />
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 rounded-xl border border-border bg-card/95 p-4 shadow-[0_16px_46px_rgba(22,66,54,0.16)] backdrop-blur">
        <div>
          {error ? (
            <p className="text-xs font-medium text-destructive">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              保存后，网页资料将成为自动填写申请表的可信来源。
            </p>
          )}
        </div>
        <Button size="lg" disabled={busy} onClick={save}>
          {busy && <LoaderCircle className="animate-spin" />}
          {busy ? '保存中' : '保存全部资料'}
        </Button>
      </div>
    </div>
  );
}
