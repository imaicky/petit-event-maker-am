import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import changelog from "@/data/changelog.json";

type ChangelogItem = {
  date: string;
  badge?: string;
  icon: string;
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
};

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function WhatsNew({ limit = 6 }: { limit?: number }) {
  const items = (changelog.items as ChangelogItem[]).slice(0, limit);

  return (
    <section className="w-full bg-white py-20 sm:py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            What&apos;s New
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            最新アップデート
          </h2>
          <p className="mt-3 text-sm text-[#666666]">
            プチイベント作成くんは毎週進化しています。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <article
              key={`${item.date}-${i}`}
              className="group relative flex flex-col rounded-3xl border border-[#E5E5E5] bg-white p-5 hover:shadow-md hover:border-[#1A1A1A]/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F7F7] text-2xl">
                  {item.icon}
                </div>
                {item.badge && (
                  <span className="inline-flex items-center rounded-full bg-[#1A1A1A] px-2 py-0.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#999999] mb-1">
                {formatDate(item.date)}
              </p>
              <h3
                className="text-base font-bold text-[#1A1A1A] mb-2 leading-snug"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                {item.title}
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed mb-3 flex-1">
                {item.description}
              </p>
              {item.link && item.linkLabel && (
                <Link
                  href={item.link}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1A1A1A] hover:underline"
                >
                  {item.linkLabel}
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/help"
            className="inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A] transition-colors"
          >
            使い方ガイドで全機能を見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
