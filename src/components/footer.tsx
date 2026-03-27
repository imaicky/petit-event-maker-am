"use client";

import Link from "next/link";
import { useCallback } from "react";

export function Footer() {
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <footer className="relative w-full bg-[#1A1A1A] text-[#999999] noise-bg overflow-hidden">
      {/* Decorative wave divider at top */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none -translate-y-[1px]">
        <svg
          className="relative block w-full h-12 sm:h-16"
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M0 80L1200 80L1200 30C1100 60 1000 10 850 25C700 40 600 70 450 50C300 30 200 60 100 40C50 30 25 45 0 35Z"
            fill="#1A1A1A"
          />
          <path
            d="M0 80L1200 80L1200 45C1050 70 950 20 800 35C650 50 550 75 400 55C250 35 150 65 50 50C25 45 10 55 0 50Z"
            fill="#1A1A1A"
            opacity="0.5"
          />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="inline-flex items-baseline gap-1.5 group">
              <span
                className="text-xl font-bold bg-gradient-to-r from-white via-[#1A1A1A] to-white bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                プチイベント
              </span>
              <span
                className="text-sm font-medium text-[#999999] group-hover:text-[#1A1A1A] transition-colors duration-300"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                作成くん
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              インスタのリンクに貼るだけ。
              <br />
              30秒でイベントページ完成。
            </p>
            {/* SNS links */}
            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#999999] hover:bg-[#1A1A1A] hover:text-white hover:scale-110 hover:rotate-6 transition-all duration-300"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (Twitter)"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[#999999] hover:bg-[#1A1A1A] hover:text-white hover:scale-110 hover:-rotate-6 transition-all duration-300"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product links */}
          <div className="flex flex-col gap-4">
            <h3
              className="text-xs font-semibold uppercase tracking-widest text-white/60"
            >
              プロダクト
            </h3>
            <ul className="flex flex-col gap-2.5">
              {[
                { href: "/explore", label: "イベントを探す" },
                { href: "/events/new", label: "イベントを作る" },
                { href: "/dashboard", label: "ダッシュボード" },
                { href: "/explore?sort=popular", label: "人気のイベント" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group/link relative inline-block text-sm transition-colors duration-300 hover:text-white"
                  >
                    {label}
                    <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-[#1A1A1A] transition-all duration-300 group-hover/link:w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div className="flex flex-col gap-4">
            <h3
              className="text-xs font-semibold uppercase tracking-widest text-white/60"
            >
              サポート
            </h3>
            <ul className="flex flex-col gap-2.5">
              {[
                { href: "/terms", label: "利用規約" },
                { href: "/privacy", label: "プライバシーポリシー" },
                { href: "/contact", label: "お問い合わせ" },
                { href: "/faq", label: "よくある質問" },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group/link relative inline-block text-sm transition-colors duration-300 hover:text-white"
                  >
                    {label}
                    <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-[#1A1A1A] transition-all duration-300 group-hover/link:w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tagline marquee */}
        <div className="mt-10 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 mr-8">
                {[
                  "簡単セットアップ",
                  "30秒で完成",
                  "インスタ連携",
                  "無料で始める",
                  "スマホ対応",
                  "参加者管理",
                  "リアルタイム更新",
                  "安心のサポート",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 text-xs text-[#999999]/50"
                  >
                    <span className="inline-block h-1 w-1 rounded-full bg-[#1A1A1A]/40" />
                    {badge}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Gradient divider + copyright */}
        <div
          className="mt-6 h-px w-full"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(26, 26, 26, 0.3), transparent)",
          }}
        />

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#999999]/70">
            &copy; 2026 プチイベント作成くん. All rights reserved.
          </p>
          <p className="text-xs text-[#999999]/50">
            小さなイベントを、もっと気軽に。
          </p>
        </div>
      </div>

      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        aria-label="ページトップへ戻る"
        className="absolute bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#999999] hover:bg-[#1A1A1A] hover:text-white hover:scale-110 transition-all duration-300 backdrop-blur-sm"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </footer>
  );
}
