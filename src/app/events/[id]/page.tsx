import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata, ResolvingMetadata } from "next";
import { Calendar, MapPin, Users, JapaneseYen, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookingForm } from "@/components/booking-form";
import { ReviewCard, type Review } from "@/components/review-card";
import { ReviewSection } from "@/components/review-section";
import { ShareButton } from "@/components/share-button";
import { StoriesDownloadButton } from "@/components/stories-download-button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventData {
  id: string;
  title: string;
  description: string;
  datetime: string;
  location: string;
  capacity: number;
  price: number;
  /** booking_count is returned by the API (computed via subquery) */
  booking_count: number;
  image_url?: string;
  category?: string;
  teacher_name?: string;
  teacher_bio?: string;
  is_published?: boolean;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3007";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function getEvent(id: string): Promise<EventData | null> {
  // Fetch from our own API to ensure consistency between Route Handler and Server Component
  const baseUrl = await getBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/events/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.event ?? null;
  } catch {
    return null;
  }
}

async function getReviews(
  id: string,
  baseUrl: string
): Promise<{ reviews: Review[]; averageRating: number | null }> {
  try {
    const res = await fetch(`${baseUrl}/api/events/${id}/reviews`, {
      cache: "no-store",
    });
    if (!res.ok) return { reviews: [], averageRating: null };
    const json = await res.json();
    const reviews: Review[] = json.reviews ?? [];
    const averageRating: number | null =
      reviews.length > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) *
              10
          ) / 10
        : null;
    return { reviews, averageRating };
  } catch {
    return { reviews: [], averageRating: null };
  }
}

// ─── Dynamic Metadata ─────────────────────────────────────────────────────────

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: EventPageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    return { title: "イベントが見つかりません | プチイベント作成くん" };
  }

  const dateStr = new Date(event.datetime).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const priceStr =
    event.price === 0
      ? "無料"
      : `¥${event.price.toLocaleString("ja-JP")}`;
  const remaining = event.capacity - event.booking_count;
  const description = [
    `📅 ${dateStr}`,
    `📍 ${event.location}`,
    `💴 ${priceStr}`,
    remaining > 0 ? `残り${remaining}名` : "満員",
    event.description.slice(0, 80),
  ]
    .filter(Boolean)
    .join("　");

  return {
    title: `${event.title} | プチイベント作成くん`,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(datetimeStr: string): string {
  try {
    return new Date(datetimeStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  } catch {
    return datetimeStr;
  }
}

function formatTime(datetimeStr: string): string {
  try {
    return new Date(datetimeStr).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// (ShareButtonInline removed — now using shared ShareButton client component)

// ─── Spots Badge ─────────────────────────────────────────────────────────────

function SpotsBadge({
  remaining,
  capacity,
}: {
  remaining: number;
  capacity: number;
}) {
  if (remaining <= 0) {
    return (
      <Badge className="bg-[#1A1A1A] px-3 py-1 text-sm text-white">
        満員
      </Badge>
    );
  }

  const isLow = remaining <= 3;
  const isAlmostFull = capacity > 0 && ((capacity - remaining) / capacity) >= 0.8;
  const fillRate = capacity > 0 ? Math.round(((capacity - remaining) / capacity) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Badge
          className={`px-3 py-1.5 text-sm ${
            isLow ? "bg-[#1A1A1A] text-white" : "bg-[#404040] text-white"
          } ${isAlmostFull ? "animate-pulse-glow" : ""}`}
        >
          {isLow && (
            <span className="relative mr-2 flex h-2.5 w-2.5 items-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="absolute inline-flex h-3.5 w-3.5 -left-[2px] -top-[2px] animate-ping rounded-full bg-white/30" style={{ animationDelay: "150ms" }} />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
          )}
          あと{remaining}名
        </Badge>
        <span className="text-sm text-[#999999]">/ {capacity}名</span>
      </div>
      <div className="h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-[#EEEEEE]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isLow ? "bg-[#1A1A1A]" : "bg-[#404040]"}`}
          style={{ width: `${Math.min(fillRate, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Teacher Avatar ──────────────────────────────────────────────────────────

function TeacherAvatar({ name }: { name: string }) {
  const initials = (() => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return parts[0].charAt(0) + parts[1].charAt(0);
    return name.slice(0, 2);
  })();

  return (
    <div className="animate-float-slow flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A1A1A]/20 via-[#F2F2F2] to-[#404040]/20 text-xl font-bold text-[#1A1A1A] shadow-sm">
      {initials}
    </div>
  );
}

// ─── Meta Cell ───────────────────────────────────────────────────────────────

function MetaCell({
  icon: Icon,
  label,
  children,
  delay,
}: {
  icon: typeof Calendar;
  label: string;
  children: React.ReactNode;
  delay: string;
}) {
  return (
    <div className={`card-hover-tilt flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[#FAFAFA] animate-fade-in-up ${delay}`}>
      <div className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F7F7] transition-transform hover:scale-110">
        <Icon className="h-5 w-5 text-[#1A1A1A] transition-transform group-hover:scale-110" />
      </div>
      <div>
        <p className="text-xs text-[#999999]">{label}</p>
        {children}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const baseUrl = await getBaseUrl();
  const [event, { reviews, averageRating }] = await Promise.all([
    getEvent(id),
    getReviews(id, baseUrl),
  ]);

  if (!event) {
    notFound();
  }

  const remaining = event.capacity - event.booking_count;
  const isPast = new Date(event.datetime) < new Date();
  const showReviews = reviews.length > 0 || isPast;

  return (
    <main className="min-h-dvh bg-[#FAFAFA]" style={{ fontFamily: "var(--font-zen-maru)" }}>

      {/* Breadcrumb */}
      <div className="sticky top-0 z-20 border-b border-[#E5E5E5]/60 glass">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <nav aria-label="パンくずリスト" className="animate-slide-in-left flex items-center gap-1.5 text-sm">
            <a href="/" className="text-[#1A1A1A] hover:underline shrink-0 transition-colors hover:text-[#111111]">
              ホーム
            </a>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#999999]" />
            <a href="/explore" className="text-[#1A1A1A] hover:underline shrink-0 transition-colors hover:text-[#111111]">
              イベントを探す
            </a>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#999999]" />
            <span className="truncate text-[#999999]">{event.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero Image — full width */}
      <div className="relative w-full overflow-hidden" style={{ maxHeight: "480px", minHeight: "240px" }}>
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.title}
            className="h-[320px] w-full object-cover sm:h-[420px] md:h-[480px]"
          />
        ) : (
          <div className="flex h-[320px] w-full items-center justify-center bg-gradient-to-br from-[#F2F2F2] via-[#EDEDED] to-[#E0E0E0] sm:h-[420px]">
            <span className="animate-float text-8xl opacity-60">🎉</span>
          </div>
        )}

        {/* Cinematic 4-stop gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 via-50% via-black/5 to-transparent" />
        {/* Side vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />

        {/* Floating category badge */}
        {event.category && (
          <div className="absolute left-6 top-6 sm:left-8 sm:top-8 animate-fade-in-up delay-100">
            <Badge className="glass-dark border border-white/10 px-3 py-1.5 text-sm text-white/90 shadow-lg">
              {event.category}
            </Badge>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="mx-auto max-w-5xl">
            {event.category && (
              <Badge className="mb-3 animate-fade-in-up delay-200 glass border-white/20 text-white shadow-sm">
                {event.category}
              </Badge>
            )}
            <h1 className="animate-fade-in-up delay-300 text-2xl font-bold leading-snug text-white drop-shadow-md sm:text-3xl md:text-4xl">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Share button overlay */}
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ShareButton url={`${baseUrl}/events/${id}`} title={event.title} variant="overlay" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* ── Left: Event details ─────────────────────────────── */}
          <article>
            {/* Spots badge */}
            <div className="mb-6 animate-fade-in-up delay-100">
              <SpotsBadge remaining={remaining} capacity={event.capacity} />
            </div>

            {/* Event meta grid */}
            <div className="mb-8 grid gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5E5E5] sm:grid-cols-2 animate-scale-in">
              <MetaCell icon={Calendar} label="開催日時" delay="delay-100">
                <p className="mt-0.5 text-sm font-semibold text-[#1A1A1A]">
                  {formatDate(event.datetime)}
                </p>
                <p className="text-sm text-[#555555]">
                  {formatTime(event.datetime)}〜
                </p>
              </MetaCell>

              <MetaCell icon={MapPin} label="場所" delay="delay-200">
                <p className="mt-0.5 text-sm font-semibold text-[#1A1A1A]">
                  {event.location}
                </p>
              </MetaCell>

              <MetaCell icon={Users} label="定員" delay="delay-300">
                <p className="mt-0.5 text-sm font-semibold text-[#1A1A1A]">
                  {event.capacity}名
                </p>
                {remaining > 0 && (
                  <p className="text-xs font-medium text-[#404040]">
                    残り{remaining}名募集中
                  </p>
                )}
              </MetaCell>

              <MetaCell icon={JapaneseYen} label="参加費" delay="delay-400">
                {event.price === 0 ? (
                  <p className="mt-0.5 text-xl font-bold text-[#404040]">無料</p>
                ) : (
                  <p className="mt-0.5 text-xl font-bold text-[#1A1A1A]">
                    ¥{event.price.toLocaleString("ja-JP")}
                  </p>
                )}
              </MetaCell>
            </div>

            {/* Description */}
            <section className="mb-8 animate-fade-in-up delay-200">
              <h2 className="mb-3 text-base font-bold text-[#1A1A1A]">
                イベント詳細
              </h2>
              <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5] noise-bg">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-[#1A1A1A]/30" />
                <p className="relative z-10 whitespace-pre-line pl-3 text-sm leading-relaxed text-[#1A1A1A]">
                  {event.description}
                </p>
              </div>
            </section>

            {/* Share & Stories actions */}
            <div className="mb-8 flex flex-wrap gap-2 animate-fade-in-up delay-200">
              <ShareButton url={`${baseUrl}/events/${id}`} title={event.title} variant="inline" />
              <StoriesDownloadButton eventId={id} eventTitle={event.title} />
            </div>

            {/* Teacher profile */}
            {event.teacher_name && (
              <section className="mb-8 animate-fade-in-up delay-300">
                <h2 className="mb-3 text-base font-bold text-[#1A1A1A]">
                  先生・主催者
                </h2>
                <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5] transition-all duration-300 hover:shadow-md hover:ring-[#1A1A1A]/20">
                  {/* Gradient border effect on hover */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(135deg, rgba(212,132,90,0.08), rgba(91,138,114,0.08))" }} />
                  <div className="relative z-10 flex items-start gap-4">
                    <TeacherAvatar name={event.teacher_name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#1A1A1A]">
                        {event.teacher_name}
                      </p>
                      <Badge className="mt-1 bg-[#F2F2F2] text-[#1A1A1A] border border-[#1A1A1A]/20 text-xs">
                        主催者
                      </Badge>
                      {event.teacher_bio && (
                        <p className="mt-2 text-sm leading-relaxed text-[#555555]">
                          {event.teacher_bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ── Reviews section ──────────────────────────────── */}
            {showReviews && (
              <section className="mb-8 animate-fade-in-up delay-400">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1A1A1A]">
                    お客様の声
                  </h2>
                  {averageRating !== null && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <svg
                            key={s}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className={`h-4 w-4 ${s <= Math.floor(averageRating) ? "text-[#1A1A1A]" : "text-[#E5E5E5]"}`}
                            aria-hidden="true"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-[#1A1A1A]">
                        {averageRating}
                      </span>
                      <span className="text-xs text-[#999999]">
                        ({reviews.length}件)
                      </span>
                    </div>
                  )}
                </div>

                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[#E5E5E5]">
                    <p className="text-sm text-[#999999]">
                      まだレビューがありません。最初のレビューを書いてみませんか？
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <ReviewSection eventId={id} />
                </div>
              </section>
            )}

            {/* Inline booking form — mobile */}
            <section className="lg:hidden animate-fade-in-up delay-500" id="booking-form">
              <h2 className="mb-4 text-base font-bold text-[#1A1A1A]">
                参加を申し込む
              </h2>
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5]">
                <BookingForm
                  eventId={event.id}
                  eventTitle={event.title}
                  price={event.price}
                  remainingSpots={remaining}
                />
              </div>
            </section>
          </article>

          {/* ── Right: Sticky booking form (desktop) ────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-[72px] rounded-2xl glass p-6 shadow-lg ring-1 ring-[#E5E5E5]/60 animate-fade-in-up delay-300" style={{ boxShadow: "0 8px 32px -8px rgba(26, 26, 26, 0.12), 0 4px 16px -4px rgba(0, 0, 0, 0.06)" }}>
              {/* Price header */}
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <p className="text-xs text-[#999999]">参加費</p>
                  {event.price === 0 ? (
                    <p className="text-2xl font-bold text-[#404040]">無料</p>
                  ) : (
                    <p className="text-2xl font-bold text-[#1A1A1A]">
                      ¥{event.price.toLocaleString("ja-JP")}
                    </p>
                  )}
                </div>
                <SpotsBadge remaining={remaining} capacity={event.capacity} />
              </div>
              <Separator className="mb-5" />
              <BookingForm
                eventId={event.id}
                eventTitle={event.title}
                price={event.price}
                remainingSpots={remaining}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile: fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/20 glass px-4 py-3 lg:hidden" style={{ boxShadow: "0 -4px 24px -4px rgba(0, 0, 0, 0.08)" }}>
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#1A1A1A]">
              {event.title}
            </p>
            <p className="text-xs font-bold text-[#1A1A1A]">
              {event.price === 0
                ? "無料"
                : `¥${event.price.toLocaleString("ja-JP")}`}
            </p>
          </div>
          <a
            href="#booking-form"
            className={`shine-on-hover shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 ${
              remaining <= 0
                ? "pointer-events-none bg-[#999999]"
                : "bg-[#1A1A1A] hover:bg-[#111111] hover:shadow-md active:scale-95"
            }`}
          >
            {remaining <= 0 ? "満員" : "申し込む"}
          </a>
        </div>
      </div>

      {/* Spacer for mobile fixed bottom bar */}
      <div className="h-20 lg:hidden" />
    </main>
  );
}

