"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  Eye,
  EyeOff,
  Plus,
  ChevronRight,
  Clock,
  TrendingUp,
  MapPin,
  Sparkles,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

type DashboardEvent = EventRow & {
  booking_count: number;
};

// --- Helpers ----------------------------------------------------------------

function formatDatetime(dt: string) {
  try {
    return new Date(dt).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function formatRelativeDate(dt: string) {
  const now = new Date();
  const date = new Date(dt);
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return "終了";
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "明日";
  if (diffDays <= 7) return `${diffDays}日後`;
  return formatDatetime(dt);
}

type TabKey = "published" | "draft" | "past";

// --- Skeleton loader --------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 rounded-xl bg-[#F2F2F2]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded-full bg-[#F2F2F2]" />
          <div className="h-4 w-3/4 rounded-full bg-[#E5E5E5]" />
          <div className="h-3 w-1/2 rounded-full bg-[#F2F2F2]" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[#F2F2F2]">
        <div className="h-3 w-1/3 rounded-full bg-[#F2F2F2]" />
        <div className="mt-2 h-1.5 w-full rounded-full bg-[#F2F2F2]" />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stat skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#E5E5E5] bg-white p-4 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-[#F2F2F2]" />
              <div className="space-y-2 flex-1">
                <div className="h-6 w-10 rounded bg-[#E5E5E5]" />
                <div className="h-3 w-16 rounded-full bg-[#F2F2F2]" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Card skeletons */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

// --- Empty state ------------------------------------------------------------

function EmptyState({ tab }: { tab: TabKey }) {
  if (tab === "published") {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
        <div className="relative mb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[#F7F7F7] animate-float">
            <span className="text-5xl">🎉</span>
          </div>
          <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] text-white shadow-md animate-scale-in delay-300">
            <Plus className="h-4 w-4" />
          </div>
          <div className="absolute -bottom-1 -left-3 h-3 w-3 rounded-full bg-[#404040]/30 animate-scale-in delay-500" />
          <div className="absolute top-2 -right-6 h-2 w-2 rounded-full bg-[#1A1A1A]/30 animate-scale-in delay-700" />
        </div>
        <h2
          className="text-xl font-bold text-[#1A1A1A] mb-2 animate-fade-in-up delay-200"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          最初のイベントを作ってみよう
        </h2>
        <p className="text-sm text-[#999999] max-w-xs leading-relaxed mb-8 animate-fade-in-up delay-300">
          30秒でイベントページが完成。
          インスタのリンクに貼るだけで参加受付がスタートできます。
        </p>
        <Link href="/events/new">
          <Button
            size="lg"
            className="h-12 px-8 rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-2 shadow-md hover:shadow-lg transition-all animate-fade-in-up delay-500 group"
          >
            <Plus className="h-5 w-5 group-hover:animate-pulse-glow" />
            はじめてのイベントを作る
          </Button>
        </Link>
      </div>
    );
  }

  if (tab === "draft") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2F2F2] text-3xl animate-float">
          📝
        </div>
        <p className="text-sm text-[#999999] animate-fade-in-up delay-200">下書き中のイベントはありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2F2F2] text-3xl animate-float">
        🗓️
      </div>
      <p className="text-sm text-[#999999] animate-fade-in-up delay-200">過去のイベントはありません</p>
    </div>
  );
}

// --- Stat card --------------------------------------------------------------

function StatCard({
  icon,
  value,
  label,
  accent,
  index = 0,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  accent?: boolean;
  index?: number;
}) {
  const delayClass = index === 0 ? "" : index === 1 ? "delay-100" : index === 2 ? "delay-200" : "delay-300";

  return (
    <div
      className={`rounded-2xl border p-4 flex items-center gap-4 card-hover-lift animate-scale-in ${delayClass} ${
        accent
          ? "animate-gradient border-transparent text-white"
          : "bg-white border-[#E5E5E5]"
      }`}
      style={
        accent
          ? {
              backgroundImage:
                "linear-gradient(135deg, #1A1A1A, #111111, #1A1A1A, #666666)",
              backgroundSize: "300% 300%",
            }
          : undefined
      }
    >
      <div
        className={`group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          accent ? "bg-white/20" : "bg-[#F7F7F7]"
        }`}
      >
        <span className={`transition-all group-hover:animate-pulse-glow ${accent ? "text-white" : "text-[#1A1A1A]"}`}>
          {icon}
        </span>
      </div>
      <div>
        <p
          className={`text-2xl font-bold leading-none ${
            accent ? "text-white" : "text-[#1A1A1A]"
          }`}
        >
          {value}
        </p>
        <p
          className={`mt-1 text-xs ${
            accent ? "text-white/80" : "text-[#999999]"
          }`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

// --- Event row card ---------------------------------------------------------

function EventCard({
  event,
  index = 0,
}: {
  event: DashboardEvent;
  index?: number;
}) {
  const fillRate = event.capacity
    ? Math.round((event.booking_count / event.capacity) * 100)
    : null;
  const relativeDate = formatRelativeDate(event.datetime);
  const isPast = new Date(event.datetime) < new Date();

  const delayClass =
    index === 0
      ? ""
      : index === 1
      ? "delay-100"
      : index === 2
      ? "delay-200"
      : index === 3
      ? "delay-300"
      : index === 4
      ? "delay-400"
      : index === 5
      ? "delay-500"
      : "delay-600";

  return (
    <div
      className={`group rounded-2xl border border-[#E5E5E5] bg-white p-4 hover:border-[#1A1A1A]/30 transition-all card-hover-tilt animate-fade-in-up ${delayClass}`}
    >
      <div className="flex items-start gap-3">
        {/* Date block */}
        <div
          className={`shine-on-hover flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-center ${
            isPast
              ? "bg-[#F2F2F2] text-[#999999]"
              : "bg-[#F7F7F7] text-[#1A1A1A]"
          }`}
        >
          <span className="text-xs font-medium leading-none">
            {new Date(event.datetime).toLocaleDateString("ja-JP", {
              month: "numeric",
            })}
            月
          </span>
          <span className="mt-0.5 text-xl font-bold leading-none">
            {new Date(event.datetime).getDate()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Status badges */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {event.is_published ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#404040]/10 px-2 py-0.5 text-xs font-medium text-[#404040]">
                <Eye className="h-2.5 w-2.5" />
                公開中
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F2] px-2 py-0.5 text-xs font-medium text-[#999999]">
                <EyeOff className="h-2.5 w-2.5" />
                下書き
              </span>
            )}
            {isPast && (
              <span className="inline-flex items-center rounded-full bg-[#E5E5E5] px-2 py-0.5 text-xs font-medium text-[#999999]">
                終了
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold text-[#1A1A1A] leading-snug line-clamp-2 group-hover:text-[#1A1A1A] transition-colors">
            {event.title}
          </h3>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2 text-xs text-[#999999]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-[#1A1A1A] shrink-0" />
              {relativeDate}
            </span>
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#1A1A1A] shrink-0" />
                <span className="truncate max-w-[120px]">{event.location}</span>
              </span>
            )}
          </div>
        </div>

        <Link href={`/events/${event.id}/edit`} className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A]"
            aria-label="編集"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Booking stats + progress */}
      <div className="mt-3 pt-3 border-t border-[#F2F2F2]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[#1A1A1A]" />
            <span className="text-sm font-medium text-[#1A1A1A]">
              {event.booking_count}
              {event.capacity && (
                <span className="text-[#999999] font-normal">
                  {" "}/ {event.capacity}名
                </span>
              )}
            </span>
            <span className="text-xs text-[#999999]">申込</span>
          </div>
          {fillRate !== null && event.capacity !== null && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                fillRate >= 80
                  ? "bg-red-50 text-red-500"
                  : fillRate >= 50
                  ? "bg-[#F7F7F7] text-[#1A1A1A]"
                  : "bg-[#F2F2F2] text-[#999999]"
              }`}
            >
              残{event.capacity - event.booking_count}枠
            </span>
          )}
        </div>
        {fillRate !== null && (
          <div className="h-1.5 w-full rounded-full bg-[#F2F2F2] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                fillRate >= 80 ? "bg-red-400" : "bg-[#1A1A1A]"
              }`}
              style={{ width: `${Math.min(fillRate, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// --- Tab controls -----------------------------------------------------------

function TabBar({
  active,
  onChange,
  counts,
}: {
  active: TabKey;
  onChange: (t: TabKey) => void;
  counts: Record<TabKey, number>;
}) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: "published", label: "公開中" },
    { key: "draft", label: "下書き" },
    { key: "past", label: "過去" },
  ];

  return (
    <div className="flex gap-1 rounded-2xl bg-[#F2F2F2] p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ${
            active === t.key
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#999999] hover:text-[#1A1A1A]"
          }`}
        >
          {t.label}
          {counts[t.key] > 0 && (
            <span
              className={`inline-flex h-4.5 min-w-[1.1rem] items-center justify-center rounded-full px-1 text-xs font-bold transition-colors duration-300 ${
                active === t.key
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-[#E5E5E5] text-[#999999]"
              }`}
            >
              {counts[t.key]}
            </span>
          )}
          {/* Animated underline for active tab */}
          {active === t.key && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-[#1A1A1A] animate-scale-in" />
          )}
        </button>
      ))}
    </div>
  );
}

// --- Main page --------------------------------------------------------------

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("published");
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setEventsLoading(true);
    try {
      const supabase = createClient();

      // Fetch events created by this user
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (eventsError || !eventsData) {
        setEvents([]);
        return;
      }

      // Fetch booking counts for each event
      const eventIds = eventsData.map((e) => e.id);
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("event_id")
        .in("event_id", eventIds)
        .eq("status", "confirmed");

      const countMap: Record<string, number> = {};
      for (const b of bookingsData ?? []) {
        countMap[b.event_id] = (countMap[b.event_id] ?? 0) + 1;
      }

      const enriched: DashboardEvent[] = eventsData.map((e) => ({
        ...e,
        booking_count: countMap[e.id] ?? 0,
      }));

      setEvents(enriched);
    } finally {
      setEventsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, fetchEvents]);

  const displayName = profile?.display_name ?? user?.email ?? "ユーザー";
  const initials = displayName.slice(0, 1);

  const now = new Date();
  const publishedEvents = events.filter(
    (e) => e.is_published && new Date(e.datetime) >= now
  );
  const draftEvents = events.filter((e) => !e.is_published);
  const pastEvents = events.filter(
    (e) => e.is_published && new Date(e.datetime) < now
  );

  const tabCounts: Record<TabKey, number> = {
    published: publishedEvents.length,
    draft: draftEvents.length,
    past: pastEvents.length,
  };

  const visibleEvents =
    activeTab === "published"
      ? publishedEvents
      : activeTab === "draft"
      ? draftEvents
      : pastEvents;

  const totalBookings = events.reduce((sum, e) => sum + e.booking_count, 0);
  const thisMonthBookings = events
    .filter((e) => {
      const d = new Date(e.datetime);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, e) => sum + e.booking_count, 0);

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-[#1A1A1A]/20 animate-pulse" />
              <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-[#1A1A1A]" />
            </div>
            <p className="text-sm text-[#999999]">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {/* Welcome header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {/* Avatar with decorative gradient blob */}
            <div className="relative animate-fade-in-up">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-[#1A1A1A]/30 via-[#666666]/20 to-[#404040]/20 blur-lg opacity-70" />
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1A1A1A] text-white text-lg font-bold shadow-md">
                {initials}
              </div>
            </div>
            <div>
              <h1
                className="text-xl font-bold text-[#1A1A1A] animate-fade-in-up delay-100"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                おかえりなさい、{displayName}さん
              </h1>
              <p className="text-xs text-[#999999] mt-0.5 flex items-center gap-1 animate-fade-in-up delay-200">
                <Sparkles className="h-3 w-3 text-[#1A1A1A]" />
                今日もイベントで人を繋げましょう
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 shrink-0 animate-fade-in-up delay-300">
            <Link href="/settings/profile">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full border-[#E5E5E5] gap-1.5 text-[#999999] hover:text-[#1A1A1A] hover:border-[#1A1A1A]/30"
              >
                <Settings className="h-3.5 w-3.5" />
                プロフィール編集
              </Button>
            </Link>
            <Link href="/events/new">
              <Button
                size="sm"
                className="h-9 px-5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-1.5 shadow-sm hover:shadow-md transition-all shine-on-hover"
              >
                <Plus className="h-4 w-4" />
                新しいイベント
              </Button>
            </Link>
          </div>
        </div>

        {eventsLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Stats row */}
            {events.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <StatCard
                  icon={<CalendarDays className="h-5 w-5" />}
                  value={events.length}
                  label="イベント総数"
                  index={0}
                />
                <StatCard
                  icon={<Eye className="h-5 w-5" />}
                  value={publishedEvents.length}
                  label="公開中"
                  accent
                  index={1}
                />
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  value={totalBookings}
                  label="申込み合計"
                  index={2}
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  value={thisMonthBookings}
                  label="今月の申込み"
                  index={3}
                />
              </div>
            )}

            {/* Events section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-bold text-[#1A1A1A]"
                  style={{ fontFamily: "var(--font-zen-maru)" }}
                >
                  あなたのイベント
                </h2>
                <Link
                  href="/events/new"
                  className="text-xs text-[#1A1A1A] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="h-3 w-3" />
                  新規作成
                </Link>
              </div>

              {events.length === 0 ? (
                <EmptyState tab="published" />
              ) : (
                <>
                  {/* Tab bar */}
                  <div className="mb-4">
                    <TabBar
                      active={activeTab}
                      onChange={setActiveTab}
                      counts={tabCounts}
                    />
                  </div>

                  {visibleEvents.length === 0 ? (
                    <EmptyState tab={activeTab} />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleEvents.map((event, i) => (
                        <EventCard key={event.id} event={event} index={i} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-[#E5E5E5] py-6 text-center text-xs text-[#999999]">
        <p>&copy; 2026 プチイベント作成くん</p>
      </footer>
    </div>
  );
}
