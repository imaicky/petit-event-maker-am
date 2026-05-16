import type { Metadata } from "next";
import { Noto_Serif_JP, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { PostHogProvider } from "@/components/posthog-provider";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://petit-event-maker-am.vercel.app";
const SITE_NAME = "プチイベント作成くん";
const SITE_DESCRIPTION =
  "AI教育者・コンテンツクリエイター向けのイベント作成プラットフォーム。LINE連携・キャンセル待ち自動繰上げ・参加者AIレベル分析・AI生成シラバス推薦まで、主催者UXに徹底特化。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — AI教育者向けイベントプラットフォーム`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "イベント作成",
    "イベントページ",
    "AIイベント",
    "AI勉強会",
    "プロンプトエンジニアリング",
    "LLM活用",
    "LINE連携",
    "キャンセル待ち",
    "イベント運営",
    "ワークショップ",
    "セミナー",
    "Connpass 代替",
    "Peatix 代替",
    "Instagram",
  ],
  authors: [{ name: SITE_NAME }],
  applicationName: SITE_NAME,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — AI教育者向けイベントプラットフォーム`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI教育者向けイベントプラットフォーム`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSerifJP.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Suspense fallback={null}>
            <PostHogProvider />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
