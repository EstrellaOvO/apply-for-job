import type { Metadata } from 'next';
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import './globals.css';

const sans = Noto_Sans_SC({ variable: '--font-sans-sc', subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const serif = Noto_Serif_SC({ variable: '--font-serif-sc', subsets: ['latin'], weight: ['600', '700'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://job-application-companion.alight-hare-2905.chatgpt.site'),
  title: '职途助手｜求职投递工作台',
  description: '整理简历和个人资料，发现匹配岗位，协助投递并持续跟踪申请状态。',
  openGraph: {
    title: '职途助手｜求职投递工作台',
    description: '让每一次投递都有迹可循。',
    images: [{ url: '/og.png', width: 1733, height: 907, alt: '职途助手' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '职途助手｜求职投递工作台',
    description: '让每一次投递都有迹可循。',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${sans.variable} ${serif.variable} antialiased`}>{children}</body></html>;
}
