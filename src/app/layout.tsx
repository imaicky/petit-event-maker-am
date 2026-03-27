import type { Metadata } from "next";
import {
  Noto_Serif_JP,
  Josefin_Sans,
  Noto_Sans_JP,
  DM_Sans,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const josefinSans = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "プチイベント作成くん",
  description:
    "インスタのリンクに貼るだけ。30秒でイベントページ完成。友達同士の小さなイベント告知・参加受付をかんたんに。",
  keywords: ["イベント作成", "イベントページ", "参加申し込み", "Instagram"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSerifJP.variable} ${josefinSans.variable} ${notoSansJP.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          <AuthProvider>{children}</AuthProvider>
        </body>
    </html>
  );
}
