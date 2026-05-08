import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles, LayoutList, CalendarDays } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventWithBookingCount } from "@/types/database";
import { CATEGORIES as LEGACY_CATEGORIES } from "@/lib/templates";
import { CATEGORY_ICONS } from "@/lib/constants";

// Icons for the new taxonomy. Falls back to ✨ for unmatched.
const NEW_CATEGORY_ICONS: Record<string, string> = {
  "LLM活用": "🤖",
  "画像生成": "🎨",
  "動画生成・編集": "🎬",
  "音声・音楽": "🎵",
  "プロンプトエンジニアリング": "📝",
  "AI開発・実装": "⚙️",
  "AI×ビジネス": "💼",
  "AI×クリエイティブ": "✨",
  "AIコミュニティ・座談会": "💬",
  "ライフスタイル": "🌿",
};

type DbCategory = { id: number; slug: string; name: string };

async function getDbCategories(): Promise<DbCategory[]> {
  try {
    const supabase = await createClient();
    const { data } = await (
      supabase.from as unknown as (
        t: string
      ) => ReturnType<typeof supabase.from>
    )("event_categories")
      .select("id, slug, name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    return (data ?? []) as DbCategory[];
  } catch {
    return [];
  }
}
import { EventCard } from "@/components/event-card";
import { ExploreFilters } from "@/components/explore-filters";
import { TrendingEvents } from "@/components/trending-events";
import { EventCalendar } from "@/components/event-calendar";

// ─── Data ────────────────────────────────────────────────────────────────────

type ReviewAgg = { averageRating: number; reviewCount: number };

async function getPublishedEvents(): Promise<EventWithBookingCount[]> {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return [];
    }
    const supabase = await createClient();
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error || !events) return [];

    // Bookings have RLS that hides rows from anonymous viewers,
    // so anon counts come back as 0. Use the service role client to
    // derive an accurate confirmed-only count per event for display.
    const ids = events.map((e) => e.id);
    const counts: Record<string, number> = {};
    if (ids.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        const { data: rows } = await admin
          .from("bookings")
          .select("event_id")
          .in("event_id", ids)
          .eq("status", "confirmed");
        for (const row of rows ?? []) {
          const eid = (row as { event_id: string }).event_id;
          counts[eid] = (counts[eid] ?? 0) + 1;
        }
      } catch {
        // fall back to 0 counts if admin client unavailable
      }
    }

    return events.map((e) => ({
      ...e,
      booking_count: counts[e.id] ?? 0,
    })) as EventWithBookingCount[];
  } catch {
    return [];
  }
}

async function getReviewAggregations(
  eventIds: string[]
): Promise<Record<string, ReviewAgg>> {
  if (eventIds.length === 0) return {};
  try {
    const supabase = await createClient();
    const { data: reviews } = await supabase
      .from("reviews")
      .select("event_id, rating")
      .in("event_id", eventIds);

    if (!reviews) return {};

    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of reviews) {
      if (!map[r.event_id]) map[r.event_id] = { sum: 0, count: 0 };
      map[r.event_id].sum += r.rating;
      map[r.event_id].count += 1;
    }

    const result: Record<string, ReviewAgg> = {};
    for (const [id, { sum, count }] of Object.entries(map)) {
      result[id] = {
        averageRating: Math.round((sum / count) * 10) / 10,
        reviewCount: count,
      };
    }
    return result;
  } catch {
    return {};
  }
}

// ─── Sort / Filter helpers ────────────────────────────────────────────────────

function sortEvents(
  events: EventWithBookingCount[],
  sort: string,
  reviewAggs?: Record<string, ReviewAgg>
): EventWithBookingCount[] {
  const now = Date.now();
  const isPast = (e: EventWithBookingCount) =>
    new Date(e.datetime).getTime() < now;

  // Compare function for the chosen sort axis (past-bucket is handled outside)
  let compareWithinBucket: (
    a: EventWithBookingCount,
    b: EventWithBookingCount
  ) => number;

  if (sort === "date") {
    // Upcoming: 開催が近い順 / Past: 直近に終わったもの順
    compareWithinBucket = (a, b) =>
      Math.abs(new Date(a.datetime).getTime() - now) -
      Math.abs(new Date(b.datetime).getTime() - now);
  } else if (sort === "popular") {
    compareWithinBucket = (a, b) => b.booking_count - a.booking_count;
  } else if (sort === "rating" && reviewAggs) {
    compareWithinBucket = (a, b) => {
      const aRating = reviewAggs[a.id]?.averageRating ?? 0;
      const bRating = reviewAggs[b.id]?.averageRating ?? 0;
      if (bRating !== aRating) return bRating - aRating;
      return (reviewAggs[b.id]?.reviewCount ?? 0) - (reviewAggs[a.id]?.reviewCount ?? 0);
    };
  } else {
    // Default: newest (created_at desc)
    compareWithinBucket = (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }

  // Past events always go to the bottom; within each bucket use the chosen sort
  return [...events].sort((a, b) => {
    const aPast = isPast(a);
    const bPast = isPast(b);
    if (aPast !== bPast) return aPast ? 1 : -1;
    return compareWithinBucket(a, b);
  });
}

function filterEvents(
  events: EventWithBookingCount[],
  query: string,
  category: string,
  area: string,
  locationType: string,
  categoryNameById?: Map<number, string>
): EventWithBookingCount[] {
  const q = query.toLowerCase().trim();
  const cat = category.trim();
  const ar = area.toLowerCase().trim();

  return events.filter((e) => {
    if (cat) {
      // Match by either legacy text or new category_id name
      const legacyMatch = e.category === cat;
      const newMatch =
        e.category_id != null &&
        categoryNameById?.get(e.category_id) === cat;
      if (!legacyMatch && !newMatch) return false;
    }
    if (locationType && e.location_type !== locationType) return false;
    if (ar && !(e.location ?? "").toLowerCase().includes(ar)) return false;
    if (q) {
      return (
        e.title.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.teacher_name?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });
}

// Category icons imported from @/lib/constants

// ─── Delay class helper ──────────────────────────────────────────────────────

const DELAY_CLASSES = [
  "",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-400",
  "delay-500",
  "delay-600",
  "delay-700",
] as const;

function getDelayClass(index: number): string {
  return DELAY_CLASSES[Math.min(index, DELAY_CLASSES.length - 1)] ?? "delay-700";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ExplorePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    area?: string;
    sort?: string;
    type?: string;
    view?: string;
    month?: string;
    date?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { q = "", category = "", area = "", sort = "new", type = "", view = "", month = "", date = "" } = await searchParams;

  const allEvents = await getPublishedEvents();
  const reviewAggs = await getReviewAggregations(allEvents.map((e) => e.id));
  const dbCategories = await getDbCategories();
  const categoryNameById = new Map(dbCategories.map((c) => [c.id, c.name]));
  const filtered = filterEvents(
    allEvents,
    q,
    category,
    area,
    type,
    categoryNameById
  );
  let sorted = sortEvents(filtered, sort, reviewAggs);

  // Date filter (from calendar click)
  if (date) {
    sorted = sorted.filter((e) => {
      const eventDate = new Date(e.datetime).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
      return eventDate === date;
    });
  }

  const isFiltered = !!(q || category || area || type || date);
  const isCalendarView = view === "calendar";

  // Calendar: compute current month + event counts by date
  const now = new Date();
  const calendarMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const eventCountByDate: Record<string, number> = {};
  for (const e of filtered) {
    const d = new Date(e.datetime).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    eventCountByDate[d] = (eventCountByDate[d] ?? 0) + 1;
  }

  // Base params for calendar links (preserve existing filters)
  const calBaseParams: Record<string, string> = {};
  if (q) calBaseParams.q = q;
  if (category) calBaseParams.category = category;
  if (area) calBaseParams.area = area;
  if (sort !== "new") calBaseParams.sort = sort;
  if (type) calBaseParams.type = type;

  // Category counts (count by display name; supports legacy text + new id)
  const categoryCounts: Record<string, number> = {};
  for (const e of allEvents) {
    let name: string | null = null;
    if (e.category_id != null && categoryNameById.has(e.category_id)) {
      name = categoryNameById.get(e.category_id) ?? null;
    } else if (e.category) {
      name = e.category;
    }
    if (name) categoryCounts[name] = (categoryCounts[name] ?? 0) + 1;
  }

  // Location type counts
  const typeCounts: Record<string, number> = {};
  for (const e of allEvents) {
    const t = e.location_type ?? "physical";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  // Trending events: top 4 by booking fill rate (upcoming only)
  const trendingEvents = [...allEvents]
    .filter((e) => new Date(e.datetime) >= now && (e.capacity ?? 0) > 0)
    .sort((a, b) => {
      const aRate = a.booking_count / (a.capacity ?? 1);
      const bRate = b.booking_count / (b.capacity ?? 1);
      return bRate - aRate;
    })
    .slice(0, 4);

  // Area suggestions: unique location keywords from events
  const areaSuggestions = Array.from(
    new Set(
      allEvents
        .map((e) => e.location ?? "")
        .filter(Boolean)
        .map((loc) => {
          // Extract city/area name (first segment before spaces/commas)
          const match = loc.match(/^[^\s,、]+/);
          return match ? match[0] : "";
        })
        .filter((a) => a.length >= 2)
    )
  ).slice(0, 5);

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">

      {/* ── Sticky header with glass morphism ── */}
      <div className="sticky top-0 z-10 border-b border-[#E5E5E5]/60 glass">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-base font-bold text-[#1A1A1A] shrink-0 transition-colors hover:text-[#111111]"
            >
              プチイベント
            </Link>
            <span className="text-[#E5E5E5]">/</span>
            <h1 className="text-sm font-medium text-[#1A1A1A]">
              イベントを探す
            </h1>
          </div>
        </div>
      </div>

      {/* ── Hero section with noise texture ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-white to-[#FAFAFA] pb-8 pt-10 noise-bg">
        {/* Decorative floating terracotta circle */}
        <div
          className="pointer-events-none absolute right-12 top-8 h-10 w-10 rounded-full bg-[#1A1A1A]/15 animate-float sm:right-24 sm:top-6 sm:h-14 sm:w-14"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-8 bottom-12 h-6 w-6 rounded-full bg-[#404040]/10 animate-float delay-300"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl px-4">
          <div className="mb-2 flex items-center gap-2 text-[#1A1A1A] animate-fade-in">
            {/* Sparkles with pulse animation */}
            <Sparkles className="h-4 w-4 animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-wider">Discover</span>
          </div>
          <h2 className="mb-6 text-2xl font-bold text-[#1A1A1A] sm:text-3xl animate-fade-in-up">
            気になるイベントを探そう
          </h2>

          {/* Search bar with focus-within glow */}
          <div className="group/search relative mb-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999] transition-colors group-focus-within/search:text-[#1A1A1A] sm:h-5 sm:w-5 z-10" />
            <div className="rounded-xl transition-shadow duration-300 group-focus-within/search:shadow-[0_0_0_3px_rgba(212,132,90,0.15),0_4px_16px_rgba(212,132,90,0.1)]">
              <ExploreFilters
                initialQ={q}
                initialCategory={category}
                initialArea={area}
                initialSort={sort}
                initialType={type}
                initialView={view}
                initialMonth={month}
                initialDate={date}
              />
            </div>
          </div>

          {/* Category chips with staggered entrance */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/explore"
              className={`group/chip inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all duration-200 animate-fade-in-up ${
                !category
                  ? "bg-[#1A1A1A] text-white shadow-sm scale-105"
                  : "bg-white text-[#999999] shadow-sm ring-1 ring-[#E5E5E5] hover:ring-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:scale-105 active:scale-95"
              }`}
            >
              <span className="inline-block transition-transform duration-200 group-hover/chip:scale-125 group-hover/chip:rotate-12">🎪</span>
              すべて
            </Link>
            {(() => {
              // Combine new taxonomy + legacy categories for backward compat.
              // New first (sort_order), then any legacy values that aren't already
              // present (so existing events without category_id still surface).
              const newNames = dbCategories.map((c) => c.name);
              const legacyOnly = LEGACY_CATEGORIES.filter(
                (c) => !newNames.includes(c)
              );
              const allChips: Array<{ name: string; count: number }> = [
                ...newNames.map((n) => ({ name: n, count: categoryCounts[n] ?? 0 })),
                ...legacyOnly.map((n) => ({ name: n, count: categoryCounts[n] ?? 0 })),
              ];
              return allChips.map((chip, idx) => {
                const icon =
                  NEW_CATEGORY_ICONS[chip.name] ??
                  CATEGORY_ICONS[chip.name] ??
                  "✨";
                const href = `/explore?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  category: chip.name,
                  ...(area ? { area } : {}),
                  ...(sort !== "new" ? { sort } : {}),
                  ...(type ? { type } : {}),
                }).toString()}`;
                return (
                  <Link
                    key={chip.name}
                    href={href}
                    className={`group/chip inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all duration-200 animate-fade-in-up ${getDelayClass(idx + 1)} ${
                      category === chip.name
                        ? "bg-[#1A1A1A] text-white shadow-sm scale-105"
                        : "bg-white text-[#999999] shadow-sm ring-1 ring-[#E5E5E5] hover:ring-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:scale-105 active:scale-95"
                    }`}
                  >
                    <span className="inline-block transition-transform duration-200 group-hover/chip:scale-125 group-hover/chip:rotate-12">{icon}</span>
                    {chip.name}
                    {chip.count > 0 && (
                      <span className={`ml-0.5 text-xs ${category === chip.name ? "text-white/70" : "text-[#999999]"}`}>
                        ({chip.count})
                      </span>
                    )}
                  </Link>
                );
              });
            })()}
          </div>

          {/* Location type chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2 animate-fade-in">
            <span className="text-xs text-[#999999] mr-0.5">開催形式:</span>
            {([
              { key: "", label: "すべて", icon: "🎯" },
              { key: "physical", label: "対面", icon: "🏠" },
              { key: "online", label: "オンライン", icon: "💻" },
              { key: "hybrid", label: "ハイブリッド", icon: "🔄" },
            ] as const).map(({ key, label, icon }) => {
              const isActive = type === key;
              const href = key
                ? `/explore?${new URLSearchParams({
                    ...(q ? { q } : {}),
                    ...(category ? { category } : {}),
                    ...(area ? { area } : {}),
                    ...(sort !== "new" ? { sort } : {}),
                    type: key,
                  }).toString()}`
                : `/explore?${new URLSearchParams({
                    ...(q ? { q } : {}),
                    ...(category ? { category } : {}),
                    ...(area ? { area } : {}),
                    ...(sort !== "new" ? { sort } : {}),
                  }).toString()}`;
              const count = key ? (typeCounts[key] ?? 0) : allEvents.length;
              return (
                <Link
                  key={key || "all"}
                  href={href}
                  className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#1A1A1A] text-white shadow-sm scale-105"
                      : "bg-white text-[#999999] shadow-sm ring-1 ring-[#E5E5E5] hover:ring-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:scale-105 active:scale-95"
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] ${isActive ? "text-white/70" : "text-[#999999]"}`}>
                      ({count})
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12">

        {/* ── Trending events (only on unfiltered view) ── */}
        {!isFiltered && trendingEvents.length > 0 && (
          <TrendingEvents events={trendingEvents} reviewAggs={reviewAggs} />
        )}

        {/* ── Area suggestion chips ── */}
        {areaSuggestions.length > 0 && !area && type !== "online" && (
          <div className="mb-5 flex flex-wrap gap-1.5 animate-fade-in">
            <span className="text-xs text-[#999999] mr-1 self-center">エリア:</span>
            {areaSuggestions.map((a) => (
              <Link
                key={a}
                href={`/explore?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(category ? { category } : {}),
                  area: a,
                  ...(sort !== "new" ? { sort } : {}),
                  ...(type ? { type } : {}),
                }).toString()}`}
                className="inline-flex h-7 items-center rounded-full bg-white px-3 text-xs text-[#999999] ring-1 ring-[#E5E5E5] hover:ring-[#1A1A1A]/30 hover:text-[#1A1A1A] transition-all"
              >
                {a}
              </Link>
            ))}
          </div>
        )}

        {/* ── Results count + view toggle + clear ── */}
        <div className="mb-5 flex items-center justify-between animate-fade-in">
          <p className="text-sm text-[#999999]">
            {isFiltered ? (
              <>
                <span className="font-semibold text-[#1A1A1A]">{sorted.length}</span>
                <span>件のイベントが見つかりました</span>
              </>
            ) : sorted.length === 0 ? (
              "イベントがありません"
            ) : (
              <>
                <span className="font-semibold text-[#1A1A1A]">{sorted.length}</span>
                <span>件のイベント</span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-[#E5E5E5] overflow-hidden">
              <Link
                href={`/explore?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(category ? { category } : {}),
                  ...(area ? { area } : {}),
                  ...(sort !== "new" ? { sort } : {}),
                  ...(type ? { type } : {}),
                }).toString()}`}
                className={`flex h-8 w-8 items-center justify-center transition-colors ${
                  !isCalendarView
                    ? "bg-[#1A1A1A] text-white"
                    : "bg-white text-[#999999] hover:text-[#1A1A1A]"
                }`}
                aria-label="リスト表示"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/explore?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(category ? { category } : {}),
                  ...(area ? { area } : {}),
                  ...(sort !== "new" ? { sort } : {}),
                  ...(type ? { type } : {}),
                  view: "calendar",
                }).toString()}`}
                className={`flex h-8 w-8 items-center justify-center transition-colors ${
                  isCalendarView
                    ? "bg-[#1A1A1A] text-white"
                    : "bg-white text-[#999999] hover:text-[#1A1A1A]"
                }`}
                aria-label="カレンダー表示"
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </Link>
            </div>
            {isFiltered && (
              <Link
                href="/explore"
                className="group/clear relative flex items-center gap-1 overflow-hidden rounded-full bg-[#F2F2F2] px-3 py-1 text-xs font-medium text-[#1A1A1A] transition-colors hover:bg-[#E5E5E5]"
              >
                <span
                  className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-500 group-hover/clear:translate-x-full"
                  aria-hidden="true"
                />
                <SlidersHorizontal className="relative h-3 w-3" />
                <span className="relative">フィルターをクリア</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── Calendar view ── */}
        {isCalendarView && (
          <div className="mb-6">
            <EventCalendar
              eventCountByDate={eventCountByDate}
              selectedDate={date || undefined}
              currentMonth={calendarMonth}
              baseParams={calBaseParams}
            />
          </div>
        )}

        {/* ── Event grid with staggered animations ── */}
        {sorted.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((event, index) => (
              <div
                key={event.id}
                className={`animate-fade-in-up ${getDelayClass(index)} card-hover-lift`}
              >
                <EventCard
                  id={event.id}
                  title={event.title}
                  datetime={event.datetime}
                  location={event.location ?? ""}
                  location_type={event.location_type}
                  is_limited={event.is_limited}
                  price={event.price}
                  capacity={event.capacity ?? 0}
                  booked_count={event.booking_count}
                  image_url={event.image_url ?? undefined}
                  category={event.category ?? undefined}
                  teacher_name={event.teacher_name ?? undefined}
                  averageRating={reviewAggs[event.id]?.averageRating}
                  reviewCount={reviewAggs[event.id]?.reviewCount}
                  short_code={event.short_code}
                />
              </div>
            ))}
          </div>
        ) : (
          /* ── Empty state with floating elements ── */
          <div className="relative flex flex-col items-center justify-center py-24 text-center">
            {/* Floating decorative elements */}
            <div
              className="pointer-events-none absolute left-1/4 top-8 h-8 w-8 rounded-full bg-[#1A1A1A]/10 animate-float"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute right-1/4 top-16 h-5 w-5 rounded-full bg-[#404040]/10 animate-float delay-200"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute left-1/3 bottom-16 h-6 w-6 rounded-full bg-[#1A1A1A]/8 animate-float delay-500"
              aria-hidden="true"
            />

            <div className="animate-scale-in mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-sm ring-1 ring-[#E5E5E5]">
              <span className="text-5xl animate-float">🔍</span>
            </div>
            <h2 className="mb-2 text-lg font-bold text-[#1A1A1A] animate-fade-in-up delay-100">
              イベントが見つかりませんでした
            </h2>
            <p className="max-w-xs text-sm text-[#999999] animate-fade-in-up delay-200">
              キーワードやフィルターを変えてお試しください
            </p>
            <Link
              href="/explore"
              className="group/reset mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-[#1A1A1A] px-7 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#111111] hover:shadow-md active:scale-95 animate-fade-in-up delay-300"
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              すべて表示
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
