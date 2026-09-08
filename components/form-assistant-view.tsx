'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  CircleAlert,
  Link2,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BasicProfile } from '@/components/profile-view';
import type {
  EducationRecord,
  InternshipRecord,
  ProjectRecord,
} from '@/lib/profile-records';

type Memory = { field_key: string; label: string; value: string };
type Phase = 'idle' | 'scanning' | 'review' | 'filled';

type Props = {
  profile: BasicProfile;
  education: EducationRecord[];
  internships: InternshipRecord[];
  projects: ProjectRecord[];
  memories: Memory[];
  busy: boolean;
  onRemember: (fieldKey: string, label: string, value: string) => Promise<void>;
};

type DetectedField = {
  key: string;
  label: string;
  value: string;
  source: string;
  confidence: number;
};

export function FormAssistantView({
  profile,
  education,
  internships,
  projects,
  memories,
  busy,
  onRemember,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pageUrl, setPageUrl] = useState(
    'https://careers.example.com/application/ai-agent',
  );
  const [visaAnswer, setVisaAnswer] = useState('');
  const [learnedAnswer, setLearnedAnswer] = useState('');

  const savedVisa =
    memories.find((item) => item.field_key === 'visa_sponsorship')?.value ??
    learnedAnswer;
  const school = education[0];
  const internship = internships[0];
  const project = projects[0];

  const fields = useMemo<DetectedField[]>(
    () => [
      {
        key: 'full_name',
        label: '姓名',
        value: profile.name,
        source: '标准个人资料',
        confidence: profile.name ? 99 : 0,
      },
      {
        key: 'email',
        label: '邮箱',
        value: profile.email,
        source: '标准个人资料',
        confidence: profile.email ? 99 : 0,
      },
      {
        key: 'phone',
        label: '手机号码',
        value: profile.phone,
        source: '标准个人资料',
        confidence: profile.phone ? 98 : 0,
      },
      {
        key: 'location',
        label: '当前所在城市',
        value: profile.current_location,
        source: '标准个人资料',
        confidence: profile.current_location ? 96 : 0,
      },
      {
        key: 'school',
        label: '学校名称',
        value: school?.school_name ?? '',
        source: '教育经历',
        confidence: school?.school_name ? 97 : 0,
      },
      {
        key: 'company',
        label: '最近任职公司',
        value: internship?.company_name ?? '',
        source: '实习经历',
        confidence: internship?.company_name ? 94 : 0,
      },
      {
        key: 'position',
        label: '最近职位',
        value: internship?.position ?? '',
        source: '实习经历',
        confidence: internship?.position ? 93 : 0,
      },
      {
        key: 'project',
        label: '代表项目',
        value: project?.project_name ?? '',
        source: '项目经历',
        confidence: project?.project_name ? 92 : 0,
      },
      {
        key: 'project_role',
        label: '项目角色',
        value: project ? 'Agent开发' : '',
        source: '项目经历',
        confidence: project ? 100 : 0,
      },
      {
        key: 'visa_sponsorship',
        label: '是否需要签证支持',
        value: savedVisa,
        source: savedVisa ? '已记住的答案' : '尚未学习',
        confidence: savedVisa ? 100 : 0,
      },
    ],
    [internship, profile, project, savedVisa, school],
  );

  const matched = fields.filter((field) => field.value).length;
  const visibleFields = phase === 'idle' ? [] : fields;

  const scan = () => {
    setPhase('scanning');
    window.setTimeout(() => setPhase('review'), 700);
  };

  const rememberVisa = async () => {
    const value = visaAnswer.trim();
    if (!value) return;
    await onRemember('visa_sponsorship', '是否需要签证支持', value);
    setLearnedAnswer(value);
    setVisaAnswer('');
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">表单助手</h1>
            <Badge className="border-0 bg-[#f1e8d8] text-[#865d2a]">
              交互原型
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            体验字段扫描、资料匹配、未知字段学习和确认填写的完整流程。
          </p>
        </div>
        <div className="flex gap-2">
          {phase !== 'idle' && (
            <Button variant="outline" onClick={() => setPhase('idle')}>
              <RotateCcw />
              重新演示
            </Button>
          )}
          <Button
            onClick={phase === 'review' ? () => setPhase('filled') : scan}
            disabled={phase === 'scanning' || phase === 'filled'}
          >
            {phase === 'scanning' ? (
              <LoaderCircle className="animate-spin" />
            ) : phase === 'review' ? (
              <Sparkles />
            ) : (
              <Search />
            )}
            {phase === 'scanning'
              ? '正在扫描'
              : phase === 'review'
                ? `填写 ${matched} 个可信字段`
                : phase === 'filled'
                  ? '填写完成'
                  : '模拟扫描当前页面'}
          </Button>
        </div>
      </header>

      <Card className="gap-0 border-0 shadow-none ring-border/80">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Link2 className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">演示中的招聘申请页面</p>
            <Input
              className="mt-2"
              value={pageUrl}
              onChange={(event) => setPageUrl(event.target.value)}
              aria-label="招聘申请页面地址"
            />
          </div>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">
            这一版使用页面内模拟表单展示体验，不会读取或提交真实招聘网站。正式版将由浏览器扩展连接当前标签页。
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
        <Card className="gap-0 overflow-hidden border-0 shadow-none ring-border/80">
          <CardHeader className="border-b border-border/70 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>AI Agent 开发工程师申请表</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  示例招聘系统 · 第 1 / 3 步
                </p>
              </div>
              <Badge variant="outline">
                {phase === 'filled'
                  ? '已自动填写'
                  : phase === 'idle'
                    ? '等待扫描'
                    : '已发现 10 个字段'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-5">
            {phase === 'idle' ? (
              <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center">
                <div>
                  <Search className="mx-auto size-9 text-primary/70" />
                  <p className="mt-4 text-sm font-semibold">准备扫描申请表</p>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-muted-foreground">
                    点击“模拟扫描当前页面”，助手会识别字段并与“我的资料”逐项匹配。
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleFields.map((field) => {
                  const filled = phase === 'filled' && Boolean(field.value);
                  return (
                    <label
                      key={field.key}
                      className="space-y-1.5 text-xs font-medium"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{field.label}</span>
                        {field.value ? (
                          <span className="flex items-center gap-1 text-[10px] font-normal text-primary">
                            <Check className="size-3" />
                            已匹配
                          </span>
                        ) : (
                          <span className="text-[10px] font-normal text-[#a5672f]">
                            需要补充
                          </span>
                        )}
                      </span>
                      <Input
                        readOnly
                        value={filled ? field.value : ''}
                        placeholder={
                          field.value
                            ? `将填入：${field.value}`
                            : '暂无可信答案'
                        }
                        className={
                          filled ? 'border-primary/30 bg-primary/[0.04]' : ''
                        }
                      />
                    </label>
                  );
                })}
                <div className="sm:col-span-2 flex justify-end border-t border-border/70 pt-4">
                  <Button variant="outline" disabled>
                    提交申请（原型中禁用）
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="gap-0 border-0 shadow-none ring-border/80">
            <CardHeader className="border-b border-border/70 py-4">
              <CardTitle>字段匹配结果</CardTitle>
            </CardHeader>
            <CardContent className="py-4">
              {phase === 'idle' ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  扫描后在这里查看每个字段的来源和置信度。
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-primary/8 p-3">
                      <p className="text-lg font-semibold text-primary">
                        {matched}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        可自动填写
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#f7efe3] p-3">
                      <p className="text-lg font-semibold text-[#865d2a]">
                        {fields.length - matched}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        需要回答
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-lg font-semibold">{fields.length}</p>
                      <p className="text-[10px] text-muted-foreground">
                        发现字段
                      </p>
                    </div>
                  </div>
                  {fields.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center gap-3 rounded-lg border border-border/70 p-3"
                    >
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${field.value ? 'bg-primary/10 text-primary' : 'bg-[#f7efe3] text-[#a5672f]'}`}
                      >
                        {field.value ? (
                          <Check className="size-3.5" />
                        ) : (
                          <CircleAlert className="size-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {field.label}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {field.source}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {field.confidence ? `${field.confidence}%` : '待确认'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {phase !== 'idle' && !savedVisa && (
            <Card className="gap-0 border-[#d7b77e] bg-[#fffbf3] shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CircleAlert className="size-4 text-[#a5672f]" />
                  <CardTitle>遇到一个新字段</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  “是否需要签证支持”在可信资料中没有答案。回答后将被记住，下次可以自动填写。
                </p>
                <Input
                  value={visaAnswer}
                  onChange={(event) => setVisaAnswer(event.target.value)}
                  placeholder="例如：否 / 是，需要工作签证支持"
                />
                <Button
                  className="w-full"
                  disabled={!visaAnswer.trim() || busy}
                  onClick={rememberVisa}
                >
                  {busy && <LoaderCircle className="animate-spin" />}保存并记住
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
