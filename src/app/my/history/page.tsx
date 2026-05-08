import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  CalendarDays,
  Tag,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { getUserHistory } from "@/lib/user-history";

export const dynamic = "force-dynamic";

const LEVEL_DESCRIPTIONS: Record<string, { color: string; description: string }> = {
  未参加: {
    color: "text-[#999999] bg-[#F2F2F2]",
    description: "AI関連イベントへの参加履歴がありません。気になるテーマから始めましょう。",
  },
  入門: {
    color: "text-[#404040] bg-[#FAFAFA] ring-1 ring-[#E5E5E5]",
    description: "AIの世界への第一歩。基礎を固めるイベントを継続的に参加してみましょう。",
  },
  初級: {
    color: "text-[#1A1A1A] bg-white ring-1 ring-[#1A1A1A]/20",
    description: "AIの基礎を理解されています。より専門的なテーマに広げる時期です。",
  },
  中級: {
    color: "text-white bg-[#404040]",
    description: "AIを活用する力が育っています。実装やビジネス活用への展開が見えてきます。",
  },
  上級: {
    color: "text-white bg-gradient-to-br from-[#1A1A1A] to-[#404040]",
    description: "AI領域のエキスパート層。発信側・主催側として活躍できるレベルです。",
  },
};

function MiniBar({
  data,
  emptyMessage,
}: {
  data: Array<{ name: string; count: number }>;
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return <p className="py-3 text-sm text-[#999999]">{emptyMessage}</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.name}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="truncate text-[#1A1A1A]">{d.name}</span>
            <span className="ml-2 tabular-nums text-[#666666]">{d.count}回</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F2F2F2]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1A1A1A] to-[#404040]"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return iso;
  }
}

export default async function MyHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const history = await getUserHistory(user.id);
  const levelStyle = LEVEL_DESCRIPTIONS[history.ai_level];

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/my"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          マイページに戻る
        </Link>

        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#1A1A1A]" />
          <h1 className="text-xl font-bold text-[#1A1A1A]">参加履歴・スキルマップ</h1>
        </div>

        {history.total_events === 0 ? (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 text-center">
            <p className="mb-3 text-sm text-[#666666]">
              まだ参加履歴がありません
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white"
            >
              イベントを探す
            </Link>
          </div>
        ) : (
          <>
            {/* Stat row */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                <p className="mb-1 text-xs text-[#666666]">参加イベント</p>
                <p className="text-2xl font-bold tabular-nums text-[#1A1A1A]">
                  {history.total_events}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                <p className="mb-1 text-xs text-[#666666]">分野数</p>
                <p className="text-2xl font-bold tabular-nums text-[#1A1A1A]">
                  {history.total_categories}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
                <p className="mb-1 text-xs text-[#666666]">AIイベント</p>
                <p className="text-2xl font-bold tabular-nums text-[#1A1A1A]">
                  {history.ai_event_count}
                </p>
              </div>
            </div>

            {/* AI Level */}
            <section className="mb-6 rounded-2xl border border-[#E5E5E5] bg-white p-5">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#1A1A1A]" />
                <h2 className="text-sm font-bold text-[#1A1A1A]">AIスキルレベル</h2>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold ${levelStyle?.color ?? ""}`}
                >
                  {history.ai_level}
                </span>
                {history.ai_distinct_domains > 0 && (
                  <span className="text-xs text-[#666666]">
                    {history.ai_distinct_domains}領域に参加
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#666666]">
                {levelStyle?.description}
              </p>
              <p className="mt-3 text-[10px] text-[#999999]">
                ※ AIレベルは参加履歴の累計と分野の広がりから自動算出されます。今後の参加で更新されます。
              </p>
            </section>

            {/* Two-column: by category + by topic */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <section className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
                  <Tag className="h-3.5 w-3.5" />
                  カテゴリ別の参加回数
                </h2>
                <MiniBar
                  data={history.by_category}
                  emptyMessage="カテゴリ情報なし"
                />
              </section>

              <section className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
                  <Tag className="h-3.5 w-3.5" />
                  トピック別の興味
                </h2>
                <MiniBar
                  data={history.by_tag_topic}
                  emptyMessage="トピックタグはまだ集計できません（イベント側のタグ整備中）"
                />
              </section>
            </div>

            {/* Recommendations */}
            {history.recommended_next.length > 0 && (
              <section className="mb-6 rounded-2xl border border-[#E5E5E5] bg-white p-5">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
                  <Lightbulb className="h-3.5 w-3.5" />
                  次に試したいAI領域
                </h2>
                <p className="mb-3 text-xs text-[#666666]">
                  あなたの参加履歴を元に、未経験のAI領域を提案します
                </p>
                <div className="flex flex-wrap gap-2">
                  {history.recommended_next.map((c) => (
                    <Link
                      key={c.name}
                      href={`/explore?category=${encodeURIComponent(c.name)}`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#404040] transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recent events */}
            <section className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
                <CalendarDays className="h-3.5 w-3.5" />
                直近の参加イベント
              </h2>
              <ul className="divide-y divide-[#F2F2F2]">
                {history.recent_events.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <Link
                      href={`/events/${e.id}`}
                      className="flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#1A1A1A]">
                          {e.title}
                        </p>
                        <p className="text-xs text-[#999999]">
                          {fmtDate(e.datetime)}
                          {e.category && (
                            <>
                              <span className="mx-1.5">·</span>
                              {e.category}
                            </>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
