import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  Globe,
  Twitter,
  Instagram,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AverageRatingBadge } from "@/components/average-rating-badge";
import type { Profile, Event, Menu, SnsLinks, Review } from "@/types/database";
import { ProfileTabs } from "./profile-tabs";

type EventWithBookings = Event & { booking_count: number };

function getInitials(name: string) {
  return name.slice(0, 1);
}

// ─── SNS link button ──────────────────────────────────────────────────────────

function SnsLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs text-[#999999] hover:text-[#1A1A1A] hover:border-[#1A1A1A]/40 hover:bg-[#F7F7F7] transition-all"
    >
      {icon}
      <span>{label}</span>
      <ExternalLink className="h-2.5 w-2.5 opacity-50" />
    </a>
  );
}

// ─── Review highlight card ────────────────────────────────────────────────────

function HighlightReview({ review }: { review: Review }) {
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
      <div className="flex items-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg
            key={s}
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 ${s <= review.rating ? "text-[#1A1A1A]" : "text-[#E5E5E5]"}`}
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="text-sm text-[#1A1A1A]/80 line-clamp-3 leading-relaxed">
        {review.comment}
      </p>
      <p className="mt-2 text-xs text-[#999999]">
        — {review.reviewer_name}
      </p>
    </div>
  );
}

// ─── Config ──────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

// ─── Main page ────────────────────────────────────────────────────────────────

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // Fetch profile by username
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Fetch ALL published events by this creator
  const { data: allEventsData } = await supabase
    .from("events")
    .select("*")
    .eq("creator_id", profile.id)
    .eq("is_published", true)
    .order("datetime", { ascending: false });

  const allRawEvents: Event[] = allEventsData ?? [];
  const now = new Date();

  // Split into upcoming and past
  const upcomingRaw = allRawEvents
    .filter((e) => new Date(e.datetime) >= now)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  const pastRaw = allRawEvents.filter((e) => new Date(e.datetime) < now);

  // Fetch booking counts for all events
  const allEventIds = allRawEvents.map((e) => e.id);
  let bookingCountMap: Record<string, number> = {};
  if (allEventIds.length > 0) {
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("event_id")
      .in("event_id", allEventIds)
      .eq("status", "confirmed");

    for (const b of bookingsData ?? []) {
      bookingCountMap[b.event_id] = (bookingCountMap[b.event_id] ?? 0) + 1;
    }
  }

  const enrichEvents = (events: Event[]): EventWithBookings[] =>
    events.map((e) => ({ ...e, booking_count: bookingCountMap[e.id] ?? 0 }));

  const upcomingEvents = enrichEvents(upcomingRaw);
  const pastEvents = enrichEvents(pastRaw);

  // Fetch all reviews for all events by this teacher
  let allReviews: Review[] = [];
  let totalRating = 0;
  let totalReviewCount = 0;
  let highlightReviews: Review[] = [];

  if (allEventIds.length > 0) {
    const { data: reviewsData } = await supabase
      .from("reviews")
      .select("*")
      .in("event_id", allEventIds)
      .order("rating", { ascending: false });

    allReviews = reviewsData ?? [];
    totalReviewCount = allReviews.length;
    totalRating =
      totalReviewCount > 0
        ? Math.round(
            (allReviews.reduce((sum, r) => sum + r.rating, 0) /
              totalReviewCount) *
              10
          ) / 10
        : 0;

    // Top 3 high-rated reviews for highlight
    highlightReviews = allReviews
      .filter((r) => r.rating >= 4)
      .slice(0, 3);
  }

  // Fetch published menus by this creator (use admin to bypass RLS for booking counts)
  const admin = createAdminClient();
  const { data: menusData } = await admin
    .from("menus")
    .select("*")
    .eq("creator_id", profile.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const menusRaw: Menu[] = menusData ?? [];
  const menuIds = menusRaw.map((m) => m.id);
  let menuBookingCountMap: Record<string, number> = {};
  if (menuIds.length > 0) {
    const { data: menuBookingsData } = await admin
      .from("menu_bookings")
      .select("menu_id")
      .in("menu_id", menuIds)
      .eq("status", "confirmed");

    for (const b of menuBookingsData ?? []) {
      menuBookingCountMap[b.menu_id] = (menuBookingCountMap[b.menu_id] ?? 0) + 1;
    }
  }

  const menus = menusRaw.map((m) => ({
    ...m,
    booking_count: menuBookingCountMap[m.id] ?? 0,
  }));

  const initials = getInitials(profile.display_name ?? profile.username);
  const totalParticipants = [...upcomingEvents, ...pastEvents].reduce(
    (s, e) => s + e.booking_count,
    0
  );
  const sns = (profile.sns_links ?? {}) as SnsLinks;

  return (
    <div className="min-h-dvh bg-[#FAFAFA]">
      {/* Cover / Banner */}
      <div className="relative h-40 sm:h-52 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#888888] to-[#404040]" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#FAFAFA]"
          style={{ clipPath: "ellipse(60% 100% at 50% 100%)" }}
        />
      </div>

      {/* Profile section */}
      <div className="relative mx-auto max-w-3xl px-4">
        {/* Avatar */}
        <div className="flex justify-center -mt-16 mb-4">
          <div className="relative">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1A1A1A] text-white text-3xl font-bold shadow-xl ring-4 ring-[#FAFAFA]"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? profile.username}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#404040] text-white shadow-md">
              <Star className="h-3.5 w-3.5 fill-current" />
            </div>
          </div>
        </div>

        {/* Name & handle */}
        <div className="text-center mb-4">
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-sm text-[#999999] mt-0.5">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-[#1A1A1A]/70 max-w-sm mx-auto leading-relaxed text-center whitespace-pre-wrap mb-5">
            {profile.bio}
          </p>
        )}

        {/* SNS links */}
        {(sns.instagram || sns.twitter || sns.website) && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {sns.instagram && (
              <SnsLink
                href={sns.instagram}
                icon={<Instagram className="h-3 w-3" />}
                label="Instagram"
              />
            )}
            {sns.twitter && (
              <SnsLink
                href={sns.twitter}
                icon={<Twitter className="h-3 w-3" />}
                label="Twitter"
              />
            )}
            {sns.website && (
              <SnsLink
                href={sns.website}
                icon={<Globe className="h-3 w-3" />}
                label="ウェブサイト"
              />
            )}
          </div>
        )}

        {/* Stats bar — extended with rating */}
        <div className="flex justify-center gap-0 mb-10 rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden">
          <div className="flex-1 text-center py-4 px-3">
            <p className="text-xl font-bold text-[#1A1A1A]">{upcomingEvents.length + pastEvents.length}</p>
            <p className="text-xs text-[#999999] mt-0.5">イベント数</p>
          </div>
          <div className="w-px bg-[#E5E5E5]" />
          <div className="flex-1 text-center py-4 px-3">
            <p className="text-xl font-bold text-[#1A1A1A]">{totalParticipants}</p>
            <p className="text-xs text-[#999999] mt-0.5">総参加者数</p>
          </div>
          {totalReviewCount > 0 && (
            <>
              <div className="w-px bg-[#E5E5E5]" />
              <div className="flex-1 text-center py-4 px-3">
                <div className="flex items-center justify-center gap-1">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#1A1A1A]" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <p className="text-xl font-bold text-[#1A1A1A]">{totalRating}</p>
                </div>
                <p className="text-xs text-[#999999] mt-0.5">{totalReviewCount}件のレビュー</p>
              </div>
            </>
          )}
        </div>

        {/* Highlight reviews */}
        {highlightReviews.length > 0 && (
          <div className="mb-10">
            <h2
              className="text-lg font-bold text-[#1A1A1A] mb-4"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              参加者の声
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {highlightReviews.map((review) => (
                <HighlightReview key={review.id} review={review} />
              ))}
            </div>
          </div>
        )}

        {/* Events section with tabs */}
        <div className="mb-12">
          <ProfileTabs
            upcomingEvents={upcomingEvents}
            pastEvents={pastEvents}
            upcomingCount={upcomingEvents.length}
            pastCount={pastEvents.length}
            menus={menus}
          />
        </div>
      </div>

      {/* Footer CTA */}
      <footer className="border-t border-[#E5E5E5] bg-white py-8 text-center">
        <Link href="/" className="inline-block mb-2">
          <span
            className="text-sm font-bold text-[#1A1A1A] hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            プチイベント作成くん
          </span>
        </Link>
        <p className="text-xs text-[#999999] mb-4">
          あなたもイベントページを無料で作れます
        </p>
        <Link href="/events/new" className="inline-block">
          <Button
            size="sm"
            className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] shadow-sm"
          >
            無料ではじめる
          </Button>
        </Link>
      </footer>
    </div>
  );
}
