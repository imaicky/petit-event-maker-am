import { Suspense } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { EventWithBookingCount } from "@/types/database";
import { CATEGORIES } from "@/lib/templates";
import { EventCard } from "@/components/event-card";
import { ExploreFilters } from "@/components/explore-filters";

// ─── Data ────────────────────────────────────────────────────────────────────

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
      .select(`*, booking_count:bookings(count)`)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error || !events) return [];

    return events.map((e) => {
      const raw = e.booking_count;
      const count = Array.isArray(raw)
        ? (raw[0] as { count: number } | undefined)?.count ?? 0
        : (raw as unknown as number) ?? 0;
      return { ...e, booking_count: Number(count) } as EventWithBookingCount;
    });
  } catch {
    return [];
  }
}

// ─── Sort / Filter helpers ────────────────────────────────────────────────────

function sortEvents(events: EventWithBookingCount[], sort: string): EventWithBookingCount[] {
  const now = Date.now();
  if (sort === "date") {
    return [...events].sort(
      (a, b) =>
        Math.abs(new Date(a.datetime).getTime() - now) -
        Math.abs(new Date(b.datetime).getTime() - now)
    );
  }
  if (sort === "popular") {
    return [...events].sort((a, b) => b.booking_count - a.booking_count);
  }
  // Default: newest (created_at desc)
  return [...events].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function filterEvents(
  events: EventWithBookingCount[],
  query: string,
  category: string,
  area: string
): EventWithBookingCount[] {
  const q = query.toLowerCase().trim();
  const cat = category.trim();
  const ar = area.toLowerCase().trim();

  return events.filter((e) => {
    if (cat && e.category !== cat) return false;
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

// ─── Category Icons ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  フラワー: "🌸",
  ハンドメイド: "🧶",
  カメラ: "📷",
  ネイル: "💅",
  占い: "🔮",
  ヨガ: "🧘",
  その他: "✨",
};

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
  }>;
}

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { q = "", category = "", area = "", sort = "new" } = await searchParams;

  const allEvents = await getPublishedEvents();
  const filtered = filterEvents(allEvents, q, category, area);
  const sorted = sortEvents(filtered, sort);
  const isFiltered = !!(q || category || area);

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
            {CATEGORIES.map((cat, idx) => {
              const icon = CATEGORY_ICONS[cat] ?? "✨";
              const href = `/explore?${new URLSearchParams({
                ...(q ? { q } : {}),
                category: cat,
                ...(area ? { area } : {}),
                ...(sort !== "new" ? { sort } : {}),
              }).toString()}`;
              return (
                <Link
                  key={cat}
                  href={href}
                  className={`group/chip inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all duration-200 animate-fade-in-up ${getDelayClass(idx + 1)} ${
                    category === cat
                      ? "bg-[#1A1A1A] text-white shadow-sm scale-105"
                      : "bg-white text-[#999999] shadow-sm ring-1 ring-[#E5E5E5] hover:ring-[#1A1A1A]/40 hover:text-[#1A1A1A] hover:scale-105 active:scale-95"
                  }`}
                >
                  <span className="inline-block transition-transform duration-200 group-hover/chip:scale-125 group-hover/chip:rotate-12">{icon}</span>
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12">

        {/* ── Results count + clear ── */}
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
          {isFiltered && (
            <Link
              href="/explore"
              className="group/clear relative flex items-center gap-1 overflow-hidden rounded-full bg-[#F2F2F2] px-3 py-1 text-xs font-medium text-[#1A1A1A] transition-colors hover:bg-[#E5E5E5]"
            >
              {/* Shine-on-hover overlay */}
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-500 group-hover/clear:translate-x-full"
                aria-hidden="true"
              />
              <SlidersHorizontal className="relative h-3 w-3" />
              <span className="relative">フィルターをクリア</span>
            </Link>
          )}
        </div>

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
                  price={event.price}
                  capacity={event.capacity ?? 0}
                  booked_count={event.booking_count}
                  image_url={event.image_url ?? undefined}
                  category={event.category ?? undefined}
                  teacher_name={event.teacher_name ?? undefined}
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
