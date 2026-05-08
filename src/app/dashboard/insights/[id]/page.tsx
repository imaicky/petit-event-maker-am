import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, BarChart3, TrendingUp, Users, Eye, Link2, Globe } from "lucide-react";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { getEventInsights } from "@/lib/analytics";
import { getAudienceInsights } from "@/lib/user-history";
import { SyllabusSuggester } from "@/components/syllabus-suggester";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ days?: string }>;
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-[#666666]">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums text-[#1A1A1A]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#999999]">{hint}</p>}
    </div>
  );
}

function MiniBarChart({
  data,
  emptyMessage,
}: {
  data: Array<{ label: string; count: number }>;
  emptyMessage: string;
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-[#999999] py-4 text-center">{emptyMessage}</p>
    );
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="text-sm">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="truncate text-[#1A1A1A]">{d.label}</span>
            <span className="ml-2 tabular-nums text-[#666666]">{d.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F2F2F2]">
            <div
              className="h-full rounded-full bg-[#1A1A1A]"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function EventInsightsPage({
  params,
  searchParams,
}: Props) {
  const { id: eventId } = await params;
  const { days: daysParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const allowed = await canManageEvent(supabase, eventId, user.id);
  if (!allowed) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, datetime, capacity")
    .eq("id", eventId)
    .single();
  if (!event) notFound();

  const days = Number(daysParam ?? "30");
  const safeDays = Number.isFinite(days) && days > 0 && days <= 365 ? days : 30;
  const [insights, audience] = await Promise.all([
    getEventInsights(eventId, { daysBack: safeDays }),
    getAudienceInsights(eventId),
  ]);

  const totalBookings =
    insights.bookings_confirmed +
    insights.bookings_waitlisted +
    insights.bookings_cancelled;

  // Funnel stages
  const funnel = [
    {
      label: "閲覧（ユニーク）",
      value: insights.unique_views,
      icon: Eye,
    },
    {
      label: "予約開始",
      value: totalBookings,
      icon: Users,
    },
    {
      label: "予約確定",
      value: insights.bookings_confirmed,
      icon: TrendingUp,
    },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          ダッシュボードに戻る
        </Link>

        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#1A1A1A]" />
          <h1 className="text-xl font-bold text-[#1A1A1A]">
            インサイト
          </h1>
        </div>

        <p className="mb-6 text-sm text-[#666666]">
          <span className="font-medium text-[#1A1A1A]">{event.title}</span>
          <span className="ml-2 text-xs text-[#999999]">過去 {safeDays} 日間</span>
        </p>

        {/* Range selector */}
        <div className="mb-6 inline-flex rounded-full border border-[#E5E5E5] bg-white p-1 text-xs">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/dashboard/insights/${eventId}?days=${d}`}
              className={`rounded-full px-3 py-1 transition-colors ${
                d === safeDays
                  ? "bg-[#1A1A1A] text-white"
                  : "text-[#666666] hover:text-[#1A1A1A]"
              }`}
            >
              {d}日
            </Link>
          ))}
        </div>

        {/* Stat cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="累計閲覧数"
            value={insights.total_views.toLocaleString("ja-JP")}
            icon={Eye}
          />
          <StatCard
            label="ユニーク閲覧"
            value={insights.unique_views.toLocaleString("ja-JP")}
            icon={Users}
          />
          <StatCard
            label="予約確定"
            value={insights.bookings_confirmed}
            hint={
              event.capacity
                ? `定員 ${event.capacity}名`
                : undefined
            }
            icon={TrendingUp}
          />
          <StatCard
            label="CVR (確定/UU)"
            value={`${insights.conversion_rate}%`}
            hint="ユニーク閲覧→確定の比率"
            icon={BarChart3}
          />
        </div>

        {/* Funnel */}
        <section className="mb-8 rounded-2xl border border-[#E5E5E5] bg-white p-5">
          <h2 className="mb-4 text-sm font-bold text-[#1A1A1A]">
            ファネル分析
          </h2>
          <div className="space-y-4">
            {funnel.map((stage, i) => {
              const pct = (stage.value / funnelMax) * 100;
              const drop = i > 0 ? funnel[i - 1].value - stage.value : 0;
              const dropRate =
                i > 0 && funnel[i - 1].value > 0
                  ? Math.round((drop / funnel[i - 1].value) * 1000) / 10
                  : 0;
              return (
                <div key={stage.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-[#1A1A1A]">
                      <stage.icon className="h-3.5 w-3.5" />
                      {stage.label}
                    </span>
                    <span className="tabular-nums font-bold text-[#1A1A1A]">
                      {stage.value.toLocaleString("ja-JP")}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#F2F2F2]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1A1A1A] to-[#404040]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {i > 0 && drop > 0 && (
                    <p className="mt-1 text-xs text-[#999999]">
                      前段から {drop.toLocaleString("ja-JP")}名 離脱（{dropRate}%）
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sources */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
              <Link2 className="h-3.5 w-3.5" />
              流入元（Referrer）
            </h2>
            <MiniBarChart
              data={insights.top_referrers.map((r) => ({
                label: r.source,
                count: r.count,
              }))}
              emptyMessage="リファラ情報なし（直接アクセスのみ）"
            />
          </section>

          <section className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
              <Globe className="h-3.5 w-3.5" />
              UTMキャンペーン
            </h2>
            <MiniBarChart
              data={insights.top_utm_sources.map((r) => ({
                label: r.source,
                count: r.count,
              }))}
              emptyMessage="UTMタグなし"
            />
            <p className="mt-3 text-xs text-[#999999]">
              共有URLに <code className="rounded bg-[#F2F2F2] px-1">?utm_source=line</code> 等を付けると流入元別に集計できます
            </p>
          </section>
        </div>

        {/* Daily views */}
        {insights.views_by_day.length > 0 && (
          <section className="mb-8 rounded-2xl border border-[#E5E5E5] bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-[#1A1A1A]">
              日別閲覧数
            </h2>
            <MiniBarChart
              data={insights.views_by_day.map((d) => ({
                label: d.date.slice(5),
                count: d.count,
              }))}
              emptyMessage=""
            />
          </section>
        )}

        {/* Audience interest analysis */}
        {audience.participant_count > 0 && (
          <section className="mb-8 rounded-2xl border border-[#E5E5E5] bg-white p-5">
            <h2 className="mb-1 text-sm font-bold text-[#1A1A1A]">
              参加者の興味プロファイル
            </h2>
            <p className="mb-4 text-xs text-[#666666]">
              本イベント以外で参加者が参加しているカテゴリ（{audience.participant_count}名分）
            </p>

            {/* AI level distribution */}
            {Object.values(audience.audience_ai_level_distribution).some(
              (n) => n > 0
            ) && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-[#666666]">
                  参加者のAIレベル分布
                </p>
                <div className="flex h-8 w-full overflow-hidden rounded-full bg-[#F2F2F2] text-[10px] font-medium text-white">
                  {(["未参加", "入門", "初級", "中級", "上級"] as const).map(
                    (lvl) => {
                      const n = audience.audience_ai_level_distribution[lvl] ?? 0;
                      if (n === 0) return null;
                      const pct = (n / audience.participant_count) * 100;
                      const colors: Record<typeof lvl, string> = {
                        未参加: "bg-[#CCCCCC] text-[#1A1A1A]",
                        入門: "bg-[#999999]",
                        初級: "bg-[#666666]",
                        中級: "bg-[#404040]",
                        上級: "bg-[#1A1A1A]",
                      };
                      return (
                        <div
                          key={lvl}
                          className={`flex items-center justify-center px-1 ${colors[lvl]}`}
                          style={{ width: `${pct}%` }}
                          title={`${lvl}: ${n}名`}
                        >
                          {pct > 12 ? `${lvl} ${n}` : ""}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Other categories */}
            <div>
              <p className="mb-2 text-xs font-medium text-[#666666]">
                参加者が他に参加しているカテゴリ
              </p>
              <MiniBarChart
                data={audience.audience_categories.map((c) => ({
                  label: c.name,
                  count: c.count,
                }))}
                emptyMessage="他のイベント参加履歴なし"
              />
            </div>
          </section>
        )}

        {/* Syllabus suggestions */}
        <SyllabusSuggester eventId={eventId} />

        {/* Note */}
        <p className="text-xs text-[#999999]">
          * 計測は 2026-05-09 以降のデータに基づきます。それ以前の閲覧は記録されていません。
        </p>
      </div>
    </main>
  );
}
