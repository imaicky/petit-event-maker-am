import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Globe,
  Twitter,
  Instagram,
  Star,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Event, SnsLinks } from "@/types/database";

type EventWithBookings = Event & { booking_count: number };

function formatDateShort(dt: string) {
  try {
    return new Date(dt).toLocaleDateString("ja-JP", {
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

// ─── Event card ───────────────────────────────────────────────────────────────

function PublicEventCard({ event }: { event: EventWithBookings }) {
  const spotsLeft = event.capacity ? event.capacity - event.booking_count : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isAlmostFull = spotsLeft !== null && spotsLeft <= 2 && !isFull;

  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden hover:shadow-lg hover:border-[#1A1A1A]/30 transition-all duration-200">
        {/* Image / placeholder */}
        <div className="h-40 flex items-center justify-center bg-gradient-to-br from-[#F2F2F2] to-[#E0E0E0] relative overflow-hidden">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image_url}
              alt={event.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-5xl opacity-70">🎉</span>
          )}
          {/* Price badge */}
          <div className="absolute top-3 right-3">
            <span className="inline-block rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-[#1A1A1A] shadow-sm">
              {(event.price ?? 0) === 0
                ? "無料"
                : `¥${(event.price ?? 0).toLocaleString("ja-JP")}`}
            </span>
          </div>
          {/* Availability badge */}
          {spotsLeft !== null && (
            <div className="absolute bottom-3 left-3">
              <span
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
                  isFull
                    ? "bg-[#E5E5E5]/90 text-[#999999]"
                    : isAlmostFull
                    ? "bg-red-500/90 text-white"
                    : "bg-[#404040]/90 text-white"
                }`}
              >
                {isFull ? "満員" : `残${spotsLeft}枠`}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3
            className="font-bold text-[#1A1A1A] leading-snug line-clamp-2 group-hover:text-[#1A1A1A] transition-colors"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            {event.title}
          </h3>

          <div className="space-y-1.5 text-xs text-[#999999]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-[#1A1A1A] shrink-0" />
              <span>{formatDateShort(event.datetime)}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-[#1A1A1A] shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-xs text-[#999999]">
              <Users className="h-3 w-3 text-[#1A1A1A]" />
              <span>{event.booking_count}名申込み済み</span>
            </div>
            <span className="flex items-center gap-0.5 text-xs font-medium text-[#1A1A1A] group-hover:gap-1 transition-all">
              詳細を見る
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
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

  // Fetch published upcoming events by this creator
  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .eq("creator_id", profile.id)
    .eq("is_published", true)
    .gte("datetime", new Date().toISOString())
    .order("datetime", { ascending: true });

  const rawEvents: Event[] = eventsData ?? [];

  // Fetch booking counts for these events
  let events: EventWithBookings[] = [];
  if (rawEvents.length > 0) {
    const eventIds = rawEvents.map((e) => e.id);
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "confirmed");

    const countMap: Record<string, number> = {};
    for (const b of bookingsData ?? []) {
      countMap[b.event_id] = (countMap[b.event_id] ?? 0) + 1;
    }

    events = rawEvents.map((e) => ({
      ...e,
      booking_count: countMap[e.id] ?? 0,
    }));
  }

  const initials = getInitials(profile.display_name ?? profile.username);
  const totalParticipants = events.reduce((s, e) => s + e.booking_count, 0);
  const sns = (profile.sns_links ?? {}) as SnsLinks;

  return (
    <div className="min-h-dvh bg-[#FAFAFA]">
      {/* Cover / Banner */}
      <div className="relative h-40 sm:h-52 overflow-hidden">
        {/* Gradient + pattern background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#888888] to-[#404040]" />
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#FAFAFA]"
          style={{ clipPath: "ellipse(60% 100% at 50% 100%)" }}
        />
      </div>

      {/* Profile section */}
      <div className="relative mx-auto max-w-3xl px-4">
        {/* Avatar — overlapping the banner */}
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
            {/* Verified ring accent */}
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

        {/* Stats bar */}
        <div className="flex justify-center gap-0 mb-10 rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden">
          <div className="flex-1 text-center py-4 px-3">
            <p className="text-xl font-bold text-[#1A1A1A]">{events.length}</p>
            <p className="text-xs text-[#999999] mt-0.5">イベント数</p>
          </div>
          <div className="w-px bg-[#E5E5E5]" />
          <div className="flex-1 text-center py-4 px-3">
            <p className="text-xl font-bold text-[#1A1A1A]">{totalParticipants}</p>
            <p className="text-xs text-[#999999] mt-0.5">総参加者数</p>
          </div>
        </div>

        {/* Events section */}
        <div className="mb-12">
          <h2
            className="text-lg font-bold text-[#1A1A1A] mb-5"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            開催予定のイベント
          </h2>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
              <p className="text-[#999999] text-sm">
                現在公開中のイベントはありません
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
                <PublicEventCard key={event.id} event={event} />
              ))}
            </div>
          )}
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
