import type { InternshipRecord, ProjectRecord } from '@/lib/profile-records';

export type ParsedProfile = {
  name: string;
  email: string;
  phone: string;
  current_location: string;
  internships: InternshipRecord[];
  projects: ProjectRecord[];
};

type PdfTextItem = { str: string; transform: number[] };

function pageItemsToLines(items: unknown[]) {
  const rows: Array<{ y: number; items: Array<{ x: number; text: string }> }> = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || !('str' in item) || !('transform' in item)) continue;
    const textItem = item as PdfTextItem;
    const text = textItem.str.trim();
    if (!text) continue;
    const x = textItem.transform[4] ?? 0;
    const y = textItem.transform[5] ?? 0;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) < 3);
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push({ x, text });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) => row.items.sort((a, b) => a.x - b.x).map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export async function extractPdfText(file: File) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', window.location.origin).href;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(pageItemsToLines(content.items).join('\n'));
  }
  return pages.join('\n');
}

const sectionHeadings = [
  '教育经历', '教育背景', '工作经历', '实习经历', '工作/实习经历', '工作与实习经历',
  '项目经历', '项目经验', '技能', '专业技能', '语言水平', '证书', '获奖', '荣誉',
  '自我评价', '个人总结', 'education', 'work experience', 'internship experience',
  'project experience', 'projects', 'skills',
];

function isHeading(line: string) {
  const normalized = line.toLowerCase().replace(/[：:|]/g, '').trim();
  return normalized.length <= 24 && sectionHeadings.some((heading) => normalized === heading.toLowerCase());
}

function section(lines: string[], starts: string[]) {
  const startIndex = lines.findIndex((line) => starts.some((start) => line.toLowerCase().replace(/[：:|]/g, '').trim() === start.toLowerCase()));
  if (startIndex < 0) return [];
  const rest = lines.slice(startIndex + 1);
  const endIndex = rest.findIndex(isHeading);
  return endIndex < 0 ? rest : rest.slice(0, endIndex);
}

const dateRange = /((?:19|20)\d{2})[.\-/年]\s*(\d{1,2})\s*月?\s*(?:-|–|—|~|至|到)\s*(?:(至今|现在|目前|present)|((?:19|20)\d{2})[.\-/年]\s*(\d{1,2})\s*月?)/i;

function normalizeMonth(year?: string, month?: string) {
  return year && month ? `${year}-${month.padStart(2, '0')}` : '';
}

function splitBlocks(lines: string[]) {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (dateRange.test(line) && current.length) { blocks.push(current); current = []; }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks.filter((block) => block.some((line) => dateRange.test(line)));
}

function cleanLine(line: string) {
  return line.replace(/^[•·▪■□◆◇▸▶●○\-*]+\s*/, '').replace(/\s+/g, ' ').trim();
}

function datesFromBlock(block: string[]) {
  const line = block.find((item) => dateRange.test(item)) ?? '';
  const match = line.match(dateRange);
  return {
    line,
    start_date: normalizeMonth(match?.[1], match?.[2]),
    end_date: normalizeMonth(match?.[4], match?.[5]),
    is_current: Boolean(match?.[3]),
  };
}

function parseInternships(lines: string[]): InternshipRecord[] {
  const content = section(lines, ['工作经历', '实习经历', '工作/实习经历', '工作与实习经历', 'work experience', 'internship experience']);
  return splitBlocks(content).map((block) => {
    const dates = datesFromBlock(block);
    const candidates = block.map((line) => cleanLine(line.replace(dateRange, ''))).filter(Boolean);
    const company = candidates.find((line) => /(公司|集团|银行|证券|科技|网络|信息|研究院|实验室|中心)/.test(line)) ?? candidates[0] ?? '';
    const department = candidates.find((line) => line !== company && /(部门|事业部|中心|团队|实验室|研究部|研发部|开发部)/.test(line)) ?? '';
    const position = candidates.find((line) => line !== company && line !== department && /(实习生|工程师|开发|产品|研究|运营|算法|设计|顾问|助理|经理)/.test(line)) ?? candidates.find((line) => line !== company && line !== department) ?? '';
    const description = candidates.filter((line) => ![company, department, position].includes(line)).join('\n');
    return { id: crypto.randomUUID(), company_name: company, department_name: department, position, start_date: dates.start_date, end_date: dates.end_date, is_current: dates.is_current, description };
  }).filter((item) => item.company_name || item.position || item.description);
}

function parseProjects(lines: string[]): ProjectRecord[] {
  const content = section(lines, ['项目经历', '项目经验', 'project experience', 'projects']);
  return splitBlocks(content).map((block) => {
    const dates = datesFromBlock(block);
    const candidates = block.map((line) => cleanLine(line.replace(dateRange, ''))).filter(Boolean);
    const projectName = candidates.find((line) => line.length <= 60 && !/(项目描述|技术栈|主要工作|职责|负责|实现|开发|基于|支持)/.test(line)) ?? candidates[0] ?? '';
    const description = candidates.filter((line) => line !== projectName).join('\n');
    return { id: crypto.randomUUID(), project_name: projectName, role: 'Agent开发' as const, start_date: dates.start_date, end_date: dates.end_date, is_current: dates.is_current, description };
  }).filter((item) => item.project_name || item.description);
}

export function parseProfile(text: string): ParsedProfile {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = text.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/)?.[0]?.replace(/\s/g, '') ?? '';
  const name = lines.find((line) => /^[\u4e00-\u9fff·]{2,8}$/.test(line) && !/(简历|教育|经历|技能|项目)/.test(line)) ?? '';
  const cities = ['北京', '上海', '深圳', '广州', '杭州', '成都', '南京', '苏州', '武汉', '西安', '重庆', '长沙'];
  const currentLocation = cities.find((city) => text.includes(city)) ?? '';
  return { name, email, phone, current_location: currentLocation, internships: parseInternships(lines), projects: parseProjects(lines) };
}
