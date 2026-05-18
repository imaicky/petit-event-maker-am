"use client";

/**
 * LINE 管理ダッシュボード
 *
 * 主催者が LINE 配信状況を俯瞰できる集計ページ。
 *   - フォロワー数（active / blocked）
 *   - 未紐付け参加者数（リマインドが届かない可能性のある人数）
 *   - 直近のリマインダー送信履歴
 *   - 直近のブロードキャスト送信履歴
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  MessageSquare,
  Users,
  UserX,
  AlertTriangle,
  Bell,
  Send,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

type Insights = {
  hasAccount: boolean;
  account?: {
    channelName: string;
    botBasicId: string | null;
    isActive: boolean;
  };
  followers: { active: number; blocked: number };
  reminders: {
    recent: Array<{
      event_id: string;
      event_title: string;
      offset_hours: number;
      sent_at: string;
      recipient_count: number;
      channel: string;
    }>;
  };
  broadcasts: {
    recent: Array<{
      event_id: string;
      event_title: string;
      sent_at: string;
    }>;
  };
  attendees: { unlinkedUpcoming: number; totalUpcoming: number };
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function offsetLabel(h: number): string {
  if (h === 168) return "1週間前";
  if (h === 72) return "3日前";
  if (h === 48) return "2日前";
  if (h === 24) return "1日前";
  if (h === 6) return "6時間前";
  if (h === 3) return "3時間前";
  if (h >= 24 && h % 24 === 0) return `${h / 24}日前`;
  return `${h}時間前`;
}

export default function LineInsightsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/line/insights", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as Insights;
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void fetchInsights();
  }, [user, fetchInsights]);

  if (authLoading || (loading && !data)) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
        </div>
      </div>
    );
  }

  if (!data?.hasAccount) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/settings/line"
            className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            LINE設定へ戻る
          </Link>
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-amber-900 mb-2">
              LINE連携が未設定です
            </p>
            <p className="text-xs text-amber-800 mb-4">
              先に LINE公式アカウントを連携してください。
            </p>
            <Link
              href="/settings/line"
              className="inline-flex items-center gap-2 rounded-xl bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05b34c]"
            >
              <MessageSquare className="h-4 w-4" />
              LINE連携設定へ
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const totalFollowers = data.followers.active + data.followers.blocked;
  const blockRate =
    totalFollowers > 0
      ? Math.round((data.followers.blocked / totalFollowers) * 100)
      : 0;
  const linkRate =
    data.attendees.totalUpcoming > 0
      ? Math.round(
          ((data.attendees.totalUpcoming - data.attendees.unlinkedUpcoming) /
            data.attendees.totalUpcoming) *
            100
        )
      : null;

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        <Link
          href="/settings/line"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          LINE設定へ戻る
        </Link>

        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            <TrendingUp className="h-6 w-6" />
            LINE管理ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-[#999999]">
            {data.account?.channelName}
            {data.account?.botBasicId && (
              <span className="font-mono ml-2 text-xs">
                ({data.account.botBasicId})
              </span>
            )}
          </p>
        </div>

        {/* ───── KPI cards ───── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="アクティブフォロワー"
            value={data.followers.active.toLocaleString("ja-JP")}
            tone="green"
          />
          <KpiCard
            icon={<UserX className="h-5 w-5" />}
            label="ブロック中"
            value={data.followers.blocked.toLocaleString("ja-JP")}
            sublabel={
              totalFollowers > 0 ? `${blockRate}%` : undefined
            }
            tone={blockRate > 20 ? "red" : "neutral"}
          />
          <KpiCard
            icon={<Bell className="h-5 w-5" />}
            label="今後の参加者"
            value={data.attendees.totalUpcoming.toLocaleString("ja-JP")}
            tone="neutral"
          />
          <KpiCard
            icon={<Sparkles className="h-5 w-5" />}
            label="LINE紐付け率"
            value={linkRate === null ? "—" : `${linkRate}%`}
            sublabel={
              data.attendees.totalUpcoming > 0
                ? `未紐付け ${data.attendees.unlinkedUpcoming}名`
                : undefined
            }
            tone={linkRate !== null && linkRate < 50 ? "amber" : "green"}
          />
        </div>

        {/* ───── 未紐付け警告 ───── */}
        {data.attendees.unlinkedUpcoming > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900 mb-1">
                  {data.attendees.unlinkedUpcoming} 名の参加者がLINEで通知を受け取れません
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  申込時に「LINEで通知を受け取る」を案内しても紐付けしていない参加者です。
                  リマインダーはメールのみで届きます。事前にメールで友だち追加URLをご案内いただくと到達率が上がります。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ───── 直近のリマインダー履歴 ───── */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            直近のリマインダー送信
          </h2>
          {data.reminders.recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-6 text-center text-sm text-[#999999]">
              まだリマインダー送信履歴はありません
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
              <ul className="divide-y divide-[#F2F2F2]">
                {data.reminders.recent.map((r) => (
                  <li
                    key={`${r.event_id}-${r.offset_hours}-${r.sent_at}`}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-[#FAFAFA]"
                  >
                    <span className="h-8 w-8 shrink-0 rounded-full bg-[#06C755]/10 flex items-center justify-center">
                      <Bell className="h-4 w-4 text-[#06C755]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">
                        {r.event_title}
                      </p>
                      <p className="text-xs text-[#999999]">
                        {offsetLabel(r.offset_hours)} / {formatDateTime(r.sent_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#1A1A1A]">
                        {r.recipient_count}
                      </p>
                      <p className="text-[10px] text-[#999999]">{r.channel}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ───── 直近のブロードキャスト送信 ───── */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
            <Send className="h-4 w-4" />
            直近のイベント告知配信
          </h2>
          {data.broadcasts.recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-6 text-center text-sm text-[#999999]">
              まだイベント告知配信はありません
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
              <ul className="divide-y divide-[#F2F2F2]">
                {data.broadcasts.recent.map((b) => (
                  <li
                    key={`${b.event_id}-${b.sent_at}`}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-[#FAFAFA]"
                  >
                    <span className="h-8 w-8 shrink-0 rounded-full bg-[#06C755]/10 flex items-center justify-center">
                      <Send className="h-4 w-4 text-[#06C755]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">
                        {b.event_title}
                      </p>
                      <p className="text-xs text-[#999999]">
                        {formatDateTime(b.sent_at)}
                      </p>
                    </div>
                    <Link
                      href={`/events/${b.event_id}`}
                      className="text-xs text-[#06C755] hover:underline"
                    >
                      確認
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sublabel,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  tone?: "green" | "amber" | "red" | "neutral";
}) {
  const toneClasses = {
    green: "bg-[#06C755]/10 text-[#06C755]",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    neutral: "bg-[#F2F2F2] text-[#666666]",
  }[tone];
  return (
    <div className="rounded-2xl bg-white border border-[#E5E5E5] p-4">
      <div
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl mb-2 ${toneClasses}`}
      >
        {icon}
      </div>
      <p className="text-[11px] text-[#999999] leading-snug">{label}</p>
      <p className="mt-0.5 text-2xl font-bold text-[#1A1A1A] tabular-nums">
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-[11px] text-[#999999]">{sublabel}</p>
      )}
    </div>
  );
}
