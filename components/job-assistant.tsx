'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, BellRing, BriefcaseBusiness, Building2, Check, ChevronRight,
  CircleUserRound, ExternalLink, FileText, LayoutDashboard, Link2,
  LoaderCircle, MapPin, Plus, Search, Sparkles, UploadCloud, X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { extractPdfText, parseProfile } from '@/lib/resume-parser';

type View = 'dashboard' | 'jobs' | 'applications' | 'profile';
type Modal = 'resume' | 'search' | 'answer' | 'application' | null;

type Profile = {
  name: string; email: string; phone: string; current_location: string;
  years_experience: string; target_roles: string; preferred_locations: string;
  expected_salary: string; notice_period: string;
};
type Job = {
  id: string; company: string; title: string; location: string; source: string;
  url: string; match_score: number; match_reasons: string; status: string; posted_at?: string;
};
type Application = {
  id: string; company: string; title: string; location: string; url: string;
  status: string; applied_at?: string; last_checked_at?: string; next_action: string; notes: string;
};
type Memory = { id: string; field_key: string; label: string; value: string; updated_at: string };
type Resume = { id: string; filename: string; size: number; is_current: number; created_at: string };
type DashboardData = { profile: Partial<Profile> | null; jobs: Job[]; applications: Application[]; memories: Memory[]; resumes: Resume[] };

const emptyProfile: Profile = {
  name: '', email: '', phone: '', current_location: '', years_experience: '',
  target_roles: '产品经理, AI 产品经理', preferred_locations: '上海, 深圳, 杭州',
  expected_salary: '', notice_period: '',
};

const demoJobs: Job[] = [
  { id: 'job-byte', company: '字节跳动', title: '产品经理 - AI 应用', location: '上海', source: '官方招聘', url: '', match_score: 91, match_reasons: '["AI 产品经验","地点匹配","行业经历相关"]', status: 'new', posted_at: '2026-09-05' },
  { id: 'job-tencent', company: '腾讯', title: '高级产品经理', location: '深圳', source: '官方招聘', url: '', match_score: 86, match_reasons: '["产品策略","跨团队协作"]', status: 'applied', posted_at: '2026-09-04' },
  { id: 'job-red', company: '小红书', title: '商业产品经理', location: '上海', source: '官方招聘', url: '', match_score: 83, match_reasons: '["商业化经验","地点匹配"]', status: 'applied', posted_at: '2026-09-03' },
];

const statusMap: Record<string, { label: string; className: string }> = {
  draft: { label: '准备投递', className: 'bg-[#f1e8d8] text-[#865d2a]' },
  submitted: { label: '已投递', className: 'bg-[#e9e8f5] text-[#555186]' },
  assessment: { label: '笔试中', className: 'bg-[#e2eee9] text-[#2d6953]' },
  interview: { label: '面试中', className: 'bg-[#dcebea] text-[#225f5b]' },
  offer: { label: '已录用', className: 'bg-[#dcebd9] text-[#356632]' },
  rejected: { label: '未通过', className: 'bg-[#f2e2df] text-[#8b4a40]' },
};

const navItems = [
  { id: 'dashboard' as const, label: '工作台', icon: LayoutDashboard },
  { id: 'jobs' as const, label: '岗位发现', icon: Search },
  { id: 'applications' as const, label: '投递记录', icon: FileText },
  { id: 'profile' as const, label: '我的资料', icon: CircleUserRound },
];

const fieldClass = 'space-y-1.5 text-xs font-medium';
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value)) : '—';
const parseReasons = (value: string) => { try { return JSON.parse(value) as string[]; } catch { return []; } };

export function JobAssistant() {
  const [view, setView] = useState<View>('dashboard');
  const [modal, setModal] = useState<Modal>(null);
  const [data, setData] = useState<DashboardData>({ profile: emptyProfile, jobs: demoJobs, applications: [], memories: [], resumes: [] });
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [answer, setAnswer] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [applicationDraft, setApplicationDraft] = useState({ company: '', title: '', location: '', url: '', status: 'draft', next_action: '', notes: '' });

  const refresh = async (quiet = false) => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) throw new Error('读取数据失败');
      const next = await response.json() as DashboardData;
      setData(next);
      setProfile({ ...emptyProfile, ...(next.profile ?? {}) });
    } catch {
      if (!quiet) setNotice('当前显示演示数据；保存功能将在数据服务连接后可用。');
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const filteredJobs = useMemo(() => {
    const keyword = jobFilter.trim().toLowerCase();
    if (!keyword) return data.jobs.length ? data.jobs : demoJobs;
    return (data.jobs.length ? data.jobs : demoJobs).filter((job) => `${job.company}${job.title}${job.location}`.toLowerCase().includes(keyword));
  }, [data.jobs, jobFilter]);

  const profileFields = [profile.name, profile.email, profile.phone, profile.current_location, profile.target_roles, profile.preferred_locations, profile.expected_salary, profile.notice_period];
  const completeness = Math.round(profileFields.filter(Boolean).length / profileFields.length * 100);

  const callApi = async (body: unknown) => {
    const response = await fetch('/api/dashboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || '保存失败');
    return result;
  };

  const saveProfile = async () => {
    setBusy(true);
    try { await callApi({ type: 'save-profile', profile }); setNotice('个人资料已保存，后续表单会优先复用这些信息。'); await refresh(true); }
    catch (error) { setNotice(error instanceof Error ? error.message : '保存失败'); }
    finally { setBusy(false); }
  };

  const saveAnswer = async () => {
    if (!answer.trim()) return;
    setBusy(true);
    try {
      await callApi({ type: 'remember-answer', fieldKey: 'expected_salary', label: '期望薪资', value: answer.trim(), scope: 'global' });
      const nextProfile = { ...profile, expected_salary: answer.trim() };
      await callApi({ type: 'save-profile', profile: nextProfile });
      setProfile(nextProfile); setNotice('已记住“期望薪资”。下次遇到相同字段会自动填入。'); setModal(null); setAnswer(''); await refresh(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : '保存失败'); }
    finally { setBusy(false); }
  };

  const uploadResume = async () => {
    if (!uploadFile) return;
    setBusy(true);
    try {
      const rawText = await extractPdfText(uploadFile);
      const parsed = parseProfile(rawText);
      const form = new FormData(); form.append('file', uploadFile); form.append('rawText', rawText); form.append('profile', JSON.stringify(parsed));
      const response = await fetch('/api/resumes', { method: 'POST', body: form });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || '上传失败');
      setNotice(`已读取 ${uploadFile.name}，并从中整理出可识别的联系方式。请到“我的资料”确认。`);
      setModal(null); setUploadFile(null); await refresh(true); setView('profile');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'PDF 解析失败，请确认文件未加密。'); }
    finally { setBusy(false); }
  };

  const startSearch = () => {
    if (siteUrl) window.open(siteUrl, '_blank', 'noopener,noreferrer');
    setNotice(siteUrl ? '已打开招聘官网。找到合适岗位后，把岗位链接加入投递记录即可继续。' : '已按当前方向展示匹配岗位；也可以粘贴指定公司的招聘官网。');
    setModal(null); setView('jobs');
  };

  const createApplication = async (draft = applicationDraft) => {
    if (!draft.company.trim() || !draft.title.trim()) { setNotice('请至少填写公司和岗位名称。'); return; }
    setBusy(true);
    try {
      await callApi({ type: 'add-application', application: { ...draft, applied_at: draft.status === 'draft' ? '' : new Date().toISOString() } });
      setNotice('投递记录已创建。'); setModal(null); setApplicationDraft({ company: '', title: '', location: '', url: '', status: 'draft', next_action: '', notes: '' }); await refresh(true); setView('applications');
    } catch (error) { setNotice(error instanceof Error ? error.message : '创建失败'); }
    finally { setBusy(false); }
  };

  const addJobToApplications = (job: Job) => void createApplication({ company: job.company, title: job.title, location: job.location, url: job.url, status: 'draft', next_action: '确认信息并完成投递', notes: `岗位匹配度 ${job.match_score}%` });

  const updateStatus = async (application: Application, status: string) => {
    setBusy(true);
    try { await callApi({ type: 'update-status', id: application.id, status }); setNotice('申请状态和检查时间已更新。'); await refresh(true); }
    catch (error) { setNotice(error instanceof Error ? error.message : '更新失败'); }
    finally { setBusy(false); }
  };

  const title = { dashboard: '上午好，今天继续向前一步', jobs: '找到真正适合你的机会', applications: '每一次投递都有迹可循', profile: '建立你的自动填写资料库' }[view];
  const subtitle = { dashboard: '把岗位发现、投递与跟进集中在一个地方', jobs: '根据方向、地点和简历经历筛选岗位', applications: '集中查看当前状态、下一步与检查时间', profile: '简历信息与补充答案会在后续申请中复用' }[view];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-[1580px] grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border/80 px-5 py-6 lg:flex lg:flex-col">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-3 px-2 text-left">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_6px_18px_rgba(24,72,58,0.18)]"><BriefcaseBusiness className="size-5" /></div>
            <div><p className="font-heading text-[15px] font-semibold tracking-tight">职途助手</p><p className="text-[11px] text-muted-foreground">你的求职工作台</p></div>
          </button>
          <nav className="mt-10 space-y-1" aria-label="主要导航">
            {navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${view === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" />{label}</button>)}
          </nav>
          <div className="mt-auto rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium"><Sparkles className="size-4 text-[#b97832]" />资料完整度<span className="ml-auto tabular-nums text-primary">{completeness}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeness}%` }} /></div>
            <button onClick={() => setView('profile')} className="mt-3 text-left text-[11px] leading-5 text-muted-foreground hover:text-foreground">{completeness < 100 ? '继续补充资料，减少申请时的待确认字段。' : '资料已完整，可以开始高效投递。'}</button>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-4 sm:px-8 lg:px-10 lg:py-7">
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">{navItems.map(({ id, label, icon: Icon }) => <Button key={id} variant={view === id ? 'default' : 'outline'} size="sm" onClick={() => setView(id)}><Icon />{label}</Button>)}</div>
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
            <div><p className="text-xs text-muted-foreground">{subtitle}</p><h1 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">{title}</h1></div>
            <div className="flex items-center gap-2"><Button variant="outline" size="lg" onClick={() => setModal('resume')}><FileText /> 导入简历</Button><Button size="lg" onClick={() => setModal('search')}><Search /> 开始找岗位</Button></div>
          </header>

          {notice && <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#d7c6a5] bg-[#fff8e9] px-4 py-3 text-xs text-[#72562e]"><Sparkles className="mt-0.5 size-4 shrink-0" /><p className="flex-1 leading-5">{notice}</p><button aria-label="关闭提示" onClick={() => setNotice('')}><X className="size-4" /></button></div>}
          {loading && <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />正在整理你的求职资料…</div>}

          {view === 'dashboard' && <DashboardView jobs={filteredJobs.slice(0, 3)} applications={data.applications} memories={data.memories} resume={data.resumes[0]} onView={setView} onAnswer={() => setModal('answer')} onAddJob={addJobToApplications} onImport={() => setModal('resume')} />}
          {view === 'jobs' && <JobsView jobs={filteredJobs} filter={jobFilter} onFilter={setJobFilter} onSearch={() => setModal('search')} onAdd={addJobToApplications} />}
          {view === 'applications' && <ApplicationsView applications={data.applications} busy={busy} onAdd={() => setModal('application')} onStatus={updateStatus} />}
          {view === 'profile' && <ProfileView profile={profile} setProfile={setProfile} resumes={data.resumes} memories={data.memories} busy={busy} onSave={saveProfile} onImport={() => setModal('resume')} />}
        </section>
      </div>

      <Dialog open={modal === 'resume'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>导入 PDF 简历</DialogTitle><DialogDescription>简历会被读取并整理为可复用字段，原文件安全保存。建议上传文本型 PDF，单个文件不超过 10MB。</DialogDescription></DialogHeader><label className="grid min-h-40 cursor-pointer place-items-center rounded-xl border border-dashed border-primary/35 bg-secondary/50 p-6 text-center hover:bg-secondary"><input className="sr-only" type="file" accept="application/pdf" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /><span><UploadCloud className="mx-auto mb-3 size-7 text-primary" /><strong className="block text-sm">{uploadFile ? uploadFile.name : '选择或拖入 PDF 简历'}</strong><span className="mt-1 block text-xs text-muted-foreground">{uploadFile ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB` : '系统会提取姓名、邮箱、电话、地点与经历文本'}</span></span></label><DialogFooter><Button variant="outline" onClick={() => setModal(null)}>取消</Button><Button disabled={!uploadFile || busy} onClick={uploadResume}>{busy && <LoaderCircle className="animate-spin" />}{busy ? '正在读取' : '导入并整理'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={modal === 'search'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>从目标网站发现岗位</DialogTitle><DialogDescription>可粘贴你指定的网站或某家公司的官方招聘主页。对于需要登录的网站，将在浏览器中打开并由你确认关键操作。</DialogDescription></DialogHeader><label className={fieldClass}>招聘网站地址（可选）<Input value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://careers.example.com" inputMode="url" /></label><div className="grid grid-cols-2 gap-3"><label className={fieldClass}>岗位方向<Input value={profile.target_roles} onChange={(event) => setProfile({ ...profile, target_roles: event.target.value })} /></label><label className={fieldClass}>地点偏好<Input value={profile.preferred_locations} onChange={(event) => setProfile({ ...profile, preferred_locations: event.target.value })} /></label></div><div className="rounded-lg bg-secondary/70 p-3 text-xs leading-5 text-muted-foreground">助手只会整理与你偏好匹配的岗位；提交申请前仍会让你确认岗位与资料。</div><DialogFooter><Button variant="outline" onClick={() => setModal(null)}>取消</Button><Button onClick={startSearch}>{siteUrl ? <ExternalLink /> : <Search />}{siteUrl ? '打开并查找' : '查看匹配岗位'}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={modal === 'answer'} onOpenChange={(open) => !open && setModal(null)}><DialogContent><DialogHeader><DialogTitle>遇到一个新字段</DialogTitle><DialogDescription>“期望薪资”尚未保存。回答一次后，以后遇到相同字段会自动填入，你仍可在提交前修改。</DialogDescription></DialogHeader><label className={fieldClass}>期望薪资<Input autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="例如：税前 30-35K × 15 薪，可面议" /></label><DialogFooter><Button variant="outline" onClick={() => setModal(null)}>这次跳过</Button><Button disabled={!answer.trim() || busy} onClick={saveAnswer}>{busy && <LoaderCircle className="animate-spin" />}保存并记住</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={modal === 'application'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>添加投递记录</DialogTitle><DialogDescription>把已投递或准备投递的岗位统一纳入跟踪。</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-3"><label className={fieldClass}>公司 *<Input value={applicationDraft.company} onChange={(event) => setApplicationDraft({ ...applicationDraft, company: event.target.value })} /></label><label className={fieldClass}>岗位 *<Input value={applicationDraft.title} onChange={(event) => setApplicationDraft({ ...applicationDraft, title: event.target.value })} /></label><label className={fieldClass}>地点<Input value={applicationDraft.location} onChange={(event) => setApplicationDraft({ ...applicationDraft, location: event.target.value })} /></label><label className={fieldClass}>当前状态<NativeSelect className="w-full" value={applicationDraft.status} onChange={(event) => setApplicationDraft({ ...applicationDraft, status: event.target.value })}>{Object.entries(statusMap).map(([value, item]) => <NativeSelectOption key={value} value={value}>{item.label}</NativeSelectOption>)}</NativeSelect></label></div><label className={fieldClass}>岗位链接<Input value={applicationDraft.url} onChange={(event) => setApplicationDraft({ ...applicationDraft, url: event.target.value })} inputMode="url" /></label><label className={fieldClass}>下一步<Textarea value={applicationDraft.next_action} onChange={(event) => setApplicationDraft({ ...applicationDraft, next_action: event.target.value })} placeholder="例如：周五前完成在线测评" /></label><DialogFooter><Button variant="outline" onClick={() => setModal(null)}>取消</Button><Button disabled={busy} onClick={() => createApplication()}>保存记录</Button></DialogFooter></DialogContent></Dialog>
    </main>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <Card className="gap-2 border-0 bg-card shadow-none ring-border/80"><CardHeader className="pb-0"><p className="text-xs text-muted-foreground">{label}</p><CardTitle className="font-heading text-2xl font-semibold tracking-tight">{value}</CardTitle></CardHeader><CardContent className="text-[11px] text-muted-foreground">{note}</CardContent></Card>;
}

function JobRow({ job, onAdd }: { job: Job; onAdd: (job: Job) => void }) {
  const reasons = parseReasons(job.match_reasons);
  return <article className="flex flex-col gap-3 border-b border-border/65 px-4 py-4 last:border-0 sm:flex-row sm:items-center"><div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Building2 className="size-5" /></div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{job.title}</h3><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{job.company}</span><span>·</span><span className="flex items-center gap-1"><MapPin className="size-3" />{job.location}</span><span>·</span><span>{job.source}</span></div></div><div className="flex items-center gap-2"><Badge className="border-0 bg-[#e2eee9] text-[#2d6953]">{job.match_score}% 匹配</Badge><Button variant="outline" size="sm" onClick={() => onAdd(job)}>加入投递</Button></div>{reasons.length > 0 && <span className="sr-only">匹配原因：{reasons.join('、')}</span>}</article>;
}

function DashboardView({ jobs, applications, memories, resume, onView, onAnswer, onAddJob, onImport }: { jobs: Job[]; applications: Application[]; memories: Memory[]; resume?: Resume; onView: (view: View) => void; onAnswer: () => void; onAddJob: (job: Job) => void; onImport: () => void }) {
  const active = applications.filter((item) => !['offer', 'rejected'].includes(item.status)).length;
  const interviews = applications.filter((item) => item.status === 'interview').length;
  return <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><div className="min-w-0 space-y-6"><section className="grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricCard label="新匹配岗位" value={jobs.length} note="来自目标公司" /><MetricCard label="进行中" value={active} note="持续跟踪" /><MetricCard label="面试" value={interviews} note={interviews ? '记得提前准备' : '等待新机会'} /><MetricCard label="已记住字段" value={memories.length} note="下次自动复用" /></section><Card className="gap-0 border-0 shadow-none ring-border/80"><CardHeader className="flex-row items-center justify-between border-b border-border/70 py-4"><div><CardTitle>推荐岗位</CardTitle><p className="mt-1 text-xs text-muted-foreground">演示岗位将在接入目标官网后替换为实时结果</p></div><Button variant="ghost" size="sm" onClick={() => onView('jobs')}>查看全部 <ChevronRight /></Button></CardHeader><CardContent className="px-0">{jobs.map((job) => <JobRow key={job.id} job={job} onAdd={onAddJob} />)}</CardContent></Card></div><aside className="space-y-4"><Card className="gap-0 border-0 bg-primary text-primary-foreground shadow-[0_18px_46px_rgba(22,66,54,0.18)] ring-0"><CardHeader className="border-b border-white/10 py-4"><div className="flex items-center gap-2 text-xs text-white/70"><Sparkles className="size-4 text-[#f2c989]" /> 投递助理</div><CardTitle className="mt-2 text-lg text-white">下一步已经为你整理好</CardTitle></CardHeader><CardContent className="space-y-3 py-4"><button onClick={onAnswer} className="w-full rounded-lg bg-white/10 p-3 text-left transition hover:bg-white/15"><div className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#f2c989] text-[11px] font-bold text-[#40321f]">1</span><div><p className="text-sm font-medium">确认期望薪资</p><p className="mt-1 text-xs leading-5 text-white/60">首次遇到这个字段，回答后将自动记住。</p></div></div></button><button onClick={() => onView('applications')} className="w-full rounded-lg bg-white/10 p-3 text-left transition hover:bg-white/15"><div className="flex items-start gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-bold">2</span><div><p className="text-sm font-medium">处理进行中的投递</p><p className="mt-1 text-xs leading-5 text-white/60">当前有 {active} 个申请需要持续跟进。</p></div></div></button><Button onClick={onAnswer} className="mt-1 w-full bg-[#f3d39f] text-[#30281d] hover:bg-[#f0c783]" size="lg">继续处理 <ChevronRight /></Button></CardContent></Card><Card className="gap-3 border-0 shadow-none ring-border/80"><CardHeader className="pb-0"><CardTitle>简历与资料</CardTitle></CardHeader><CardContent>{resume ? <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><FileText className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{resume.filename}</p><p className="mt-1 text-[11px] text-muted-foreground">当前简历 · {formatDate(resume.created_at)}</p></div><Check className="size-4 text-primary" /></div> : <button onClick={onImport} className="flex w-full items-center gap-3 text-left"><div className="grid size-9 place-items-center rounded-lg bg-secondary text-primary"><UploadCloud className="size-4" /></div><div><p className="text-xs font-medium">还没有导入简历</p><p className="mt-1 text-[11px] text-muted-foreground">上传 PDF 开始整理资料</p></div></button>}</CardContent></Card></aside></div>;
}

function JobsView({ jobs, filter, onFilter, onSearch, onAdd }: { jobs: Job[]; filter: string; onFilter: (value: string) => void; onSearch: () => void; onAdd: (job: Job) => void }) {
  return <div className="mt-6 space-y-5"><div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-10 pl-9" value={filter} onChange={(event) => onFilter(event.target.value)} placeholder="搜索公司、岗位或地点" /></div><Button variant="outline" size="lg" onClick={onSearch}><Link2 />指定招聘网站</Button></div><div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{jobs.map((job) => <Card key={job.id} className="gap-4 border-0 shadow-none ring-border/80"><CardHeader className="pb-0"><div className="flex items-start justify-between gap-3"><div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><Building2 className="size-5" /></div><Badge className="border-0 bg-[#e2eee9] text-[#2d6953]">{job.match_score}% 匹配</Badge></div><CardTitle className="mt-3">{job.title}</CardTitle><p className="text-xs text-muted-foreground">{job.company} · {job.location} · {job.source}</p></CardHeader><CardContent className="mt-auto"><div className="mb-4 flex flex-wrap gap-2">{parseReasons(job.match_reasons).map((reason) => <span key={reason} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">{reason}</span>)}</div><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{job.posted_at ? `${formatDate(job.posted_at)} 发布` : '近期发布'}</span><Button size="sm" onClick={() => onAdd(job)}>加入投递 <ArrowUpRight /></Button></div></CardContent></Card>)}</div></div>;
}

function ApplicationsView({ applications, busy, onAdd, onStatus }: { applications: Application[]; busy: boolean; onAdd: () => void; onStatus: (application: Application, status: string) => void }) {
  const columns = ['draft', 'submitted', 'assessment', 'interview'];
  return <div className="mt-6 space-y-6"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{columns.map((status) => <Card key={status} className="gap-2 border-0 shadow-none ring-border/80"><CardHeader className="pb-0"><p className="text-xs text-muted-foreground">{statusMap[status].label}</p><CardTitle className="font-heading text-2xl">{applications.filter((item) => item.status === status).length}</CardTitle></CardHeader><CardContent><div className="h-1 rounded-full bg-secondary"><div className={`h-full rounded-full ${status === 'draft' ? 'w-1/4' : status === 'submitted' ? 'w-2/4' : status === 'assessment' ? 'w-3/4' : 'w-full'} bg-primary/70`} /></div></CardContent></Card>)}</div><Card className="gap-0 border-0 shadow-none ring-border/80"><CardHeader className="flex-row items-center justify-between border-b border-border/70 py-4"><div><CardTitle>全部投递</CardTitle><p className="mt-1 text-xs text-muted-foreground">每次检查都会记录时间与状态变化</p></div><Button onClick={onAdd}><Plus />添加记录</Button></CardHeader><CardContent className="px-0">{applications.length ? applications.map((application) => { const meta = statusMap[application.status] ?? statusMap.draft; return <article key={application.id} className="grid gap-3 border-b border-border/65 px-4 py-4 last:border-0 md:grid-cols-[minmax(0,1.3fr)_120px_150px_minmax(160px,1fr)_120px] md:items-center"><div><p className="text-sm font-semibold">{application.title}</p><p className="mt-1 text-xs text-muted-foreground">{application.company} · {application.location || '地点未填写'}</p></div><Badge className={`${meta.className} border-0`}>{meta.label}</Badge><div className="text-xs"><p className="text-muted-foreground">投递时间</p><p className="mt-1">{formatDate(application.applied_at)}</p></div><div className="text-xs"><p className="text-muted-foreground">下一步</p><p className="mt-1 truncate">{application.next_action || '等待更新'}</p></div><NativeSelect disabled={busy} className="w-full" value={application.status} onChange={(event) => onStatus(application, event.target.value)}>{Object.entries(statusMap).map(([value, item]) => <NativeSelectOption key={value} value={value}>{item.label}</NativeSelectOption>)}</NativeSelect></article>; }) : <div className="grid min-h-52 place-items-center p-8 text-center"><div><BriefcaseBusiness className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">还没有投递记录</p><p className="mt-1 text-xs text-muted-foreground">添加第一个岗位，开始跟踪求职进度。</p></div></div>}</CardContent></Card><div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-xs"><BellRing className="size-5 text-primary" /><div className="flex-1"><p className="font-medium">定期状态检查</p><p className="mt-1 text-muted-foreground">计划每周一、周四检查一次；登录保护的网站会提醒你在浏览器中确认。</p></div><Badge variant="outline">待接入目标网站</Badge></div></div>;
}

function ProfileView({ profile, setProfile, resumes, memories, busy, onSave, onImport }: { profile: Profile; setProfile: (profile: Profile) => void; resumes: Resume[]; memories: Memory[]; busy: boolean; onSave: () => void; onImport: () => void }) {
  const inputs: Array<[keyof Profile, string, string]> = [['name', '姓名', '你的姓名'], ['email', '邮箱', 'name@example.com'], ['phone', '手机号', '用于申请联系'], ['current_location', '当前所在地', '例如：上海'], ['years_experience', '工作年限', '例如：5 年'], ['target_roles', '目标岗位', '多个方向用逗号分隔'], ['preferred_locations', '地点偏好', '例如：上海, 杭州'], ['expected_salary', '期望薪资', '例如：30-35K × 15 薪'], ['notice_period', '到岗时间', '例如：一个月内']];
  return <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><Card className="gap-0 border-0 shadow-none ring-border/80"><CardHeader className="border-b border-border/70 py-4"><CardTitle>标准个人资料</CardTitle><p className="mt-1 text-xs text-muted-foreground">这些字段会成为所有申请表的默认答案，提交前仍可单独修改。</p></CardHeader><CardContent className="grid gap-4 py-5 sm:grid-cols-2">{inputs.map(([key, label, placeholder]) => <label key={key} className={fieldClass}>{label}<Input value={profile[key]} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} placeholder={placeholder} /></label>)}<div className="sm:col-span-2 flex justify-end"><Button disabled={busy} onClick={onSave}>{busy && <LoaderCircle className="animate-spin" />}保存个人资料</Button></div></CardContent></Card><aside className="space-y-4"><Card className="gap-3 border-0 shadow-none ring-border/80"><CardHeader className="flex-row items-center justify-between pb-0"><CardTitle>简历版本</CardTitle><Button variant="ghost" size="sm" onClick={onImport}><Plus />导入</Button></CardHeader><CardContent className="space-y-3">{resumes.length ? resumes.map((resume) => <div key={resume.id} className="flex items-center gap-3 rounded-lg bg-secondary/65 p-3"><FileText className="size-4 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{resume.filename}</p><p className="mt-1 text-[11px] text-muted-foreground">{(resume.size / 1024 / 1024).toFixed(2)} MB · {formatDate(resume.created_at)}</p></div>{resume.is_current ? <Badge className="border-0 bg-primary/10 text-primary">当前</Badge> : null}</div>) : <button onClick={onImport} className="w-full rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground"><UploadCloud className="mx-auto mb-2 size-5" />导入第一份 PDF 简历</button>}</CardContent></Card><Card className="gap-3 border-0 shadow-none ring-border/80"><CardHeader className="pb-0"><CardTitle>已记住的补充答案</CardTitle></CardHeader><CardContent className="space-y-3">{memories.length ? memories.map((memory) => <div key={memory.id} className="rounded-lg border border-border/70 p-3"><div className="flex items-center justify-between"><p className="text-xs font-medium">{memory.label}</p><span className="text-[10px] text-muted-foreground">自动填写</span></div><p className="mt-2 text-xs text-muted-foreground">{memory.value}</p></div>) : <div className="rounded-lg bg-secondary/65 p-4 text-xs leading-5 text-muted-foreground"><Sparkles className="mb-2 size-4 text-primary" />申请时遇到陌生字段，助手会向你提问；你的回答会保存在这里。</div>}</CardContent></Card></aside></div>;
}
