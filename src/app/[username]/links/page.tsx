import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ExternalLink,
  Globe,
  Twitter,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Event, SnsLinks } from "@/types/database";
import { LinkEventCard } from "./link-event-card";

type EventWithBookings = Event & { booking_count: number };

export const dynamic = "force-dynamic";

// ─── OGP metadata ───────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, bio, avatar_url")
    .eq("username", username)
    .single();

  if (!profile) return { title: "ページが見つかりません" };

  const displayName = profile.display_name ?? profile.username;
  const title = `${displayName}のイベント | プチイベント作成くん`;
  const description =
    profile.bio?.slice(0, 120) ??
    `${displayName}さんのイベント一覧をチェックしよう`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(profile.avatar_url ? { images: [profile.avatar_url] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// ─── SNS icon button ────────────────────────────────────────────────────────

function SnsIconLink({
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
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#999999] hover:text-[#1A1A1A] hover:border-[#1A1A1A]/40 transition-all"
    >
      {icon}
    </a>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default async function LinksPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  // Fetch upcoming published events
  const now = new Date().toISOString();
  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .eq("creator_id", profile.id)
    .eq("is_published", true)
    .gte("datetime", now)
    .order("datetime", { ascending: true });

  const events: Event[] = eventsData ?? [];

  // Fetch booking counts
  const eventIds = events.map((e) => e.id);
  let bookingCountMap: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("event_id")
      .in("event_id", eventIds)
      .eq("status", "confirmed");

    for (const b of bookingsData ?? []) {
      bookingCountMap[b.event_id] = (bookingCountMap[b.event_id] ?? 0) + 1;
    }
  }

  const enrichedEvents: EventWithBookings[] = events.map((e) => ({
    ...e,
    booking_count: bookingCountMap[e.id] ?? 0,
  }));

  const displayName = profile.display_name ?? profile.username;
  const initials = displayName.slice(0, 1);
  const sns = (profile.sns_links ?? {}) as SnsLinks;

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAFAFA]">
      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-10">
        {/* Avatar */}
        <div className="flex justify-center mb-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1A1A1A] text-white text-2xl font-bold shadow-lg ring-4 ring-white">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        </div>

        {/* Name & handle */}
        <div className="text-center mb-2">
          <h1
            className="text-xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            {displayName}
          </h1>
          <p className="text-xs text-[#999999]">@{profile.username}</p>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-center text-sm text-[#1A1A1A]/70 leading-relaxed whitespace-pre-wrap mb-4 max-w-xs mx-auto">
            {profile.bio}
          </p>
        )}

        {/* SNS icon links */}
        {(sns.instagram || sns.twitter || sns.website) && (
          <div className="flex justify-center gap-3 mb-8">
            {sns.instagram && (
              <SnsIconLink
                href={sns.instagram}
                icon={<Instagram className="h-4 w-4" />}
                label="Instagram"
              />
            )}
            {sns.twitter && (
              <SnsIconLink
                href={sns.twitter}
                icon={<Twitter className="h-4 w-4" />}
                label="Twitter"
              />
            )}
            {sns.website && (
              <SnsIconLink
                href={sns.website}
                icon={<Globe className="h-4 w-4" />}
                label="ウェブサイト"
              />
            )}
          </div>
        )}

        {/* Events list */}
        {enrichedEvents.length > 0 ? (
          <div className="space-y-3 mb-8">
            {enrichedEvents.map((event) => (
              <LinkEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 text-center mb-8">
            <p className="text-sm text-[#999999]">
              現在、公開中のイベントはありません
            </p>
          </div>
        )}

        {/* Profile link */}
        <div className="text-center mb-6">
          <Link
            href={`/${profile.username}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1A1A1A] hover:opacity-70 transition-opacity"
          >
            プロフィールを見る
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-[#E5E5E5] bg-white py-6 text-center">
        <Link href="/" className="inline-block mb-1.5">
          <span
            className="text-sm font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            プチイベント作成くん
          </span>
        </Link>
        <p className="text-xs text-[#999999] mb-3">
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
