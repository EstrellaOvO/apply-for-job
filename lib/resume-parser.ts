export type ParsedProfile = {
  name: string;
  email: string;
  phone: string;
  current_location: string;
};

export async function extractPdfText(file: File) {
  const pdfjs = await import('pdfjs-dist');
  // The worker is served from public/ instead of being resolved relative to
  // import.meta.url. Vinext's server bundle uses file:// module URLs, which can
  // otherwise leak into the browser and make PDF.js fail to load its worker.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    '/pdf.worker.min.mjs',
    window.location.origin,
  ).href;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n');
}

export function parseProfile(text: string): ParsedProfile {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
  const phone = text.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/)?.[0]?.replace(/\s/g, '') ?? '';
  const name = lines.find((line) => /^[\u4e00-\u9fff·]{2,8}$/.test(line) && !/(简历|教育|经历|技能|项目)/.test(line)) ?? '';
  const cities = ['北京', '上海', '深圳', '广州', '杭州', '成都', '南京', '苏州', '武汉', '西安', '重庆', '长沙'];
  const currentLocation = cities.find((city) => text.includes(city)) ?? '';
  return { name, email, phone, current_location: currentLocation };
}
