"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Loader2,
  Mail,
  Phone,
  Clock,
  UserX,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { MessageDialog } from "@/components/message-dialog";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

// ─── Types ───────────────────────────────────────────────────────────────────

type Event = Database["public"]["Tables"]["events"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatBookingDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-xl bg-[#E5E5E5]" />
          <div className="h-6 w-48 animate-pulse rounded-lg bg-[#E5E5E5]" />
        </div>
        <div className="h-32 animate-pulse rounded-2xl bg-[#E5E5E5] mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-[#E5E5E5]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AttendeesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { user, isLoading: authLoading } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!eventId || !user) return;

    const supabase = createClient();

    try {
      // Fetch event and verify ownership
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError || !eventData) {
        setError("イベントが見つかりませんでした");
        setLoading(false);
        return;
      }

      // Check if current user is the creator
      if (eventData.creator_id !== user.id) {
        router.replace("/");
        return;
      }

      setEvent(eventData);

      // Fetch confirmed bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "confirmed")
        .order("created_at", { ascending: true });

      if (bookingsError) {
        setError("予約一覧の取得に失敗しました");
        setLoading(false);
        return;
      }

      setBookings(bookingsData ?? []);
    } catch {
      setError("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [eventId, user, router]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    fetchData();
  }, [authLoading, user, router, fetchData]);

  // ── Loading ─────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return <LoadingSkeleton />;
  }

  // ── Error ───────────────────────────────────────────────────────────────

  if (error || !event) {
    return (
      <main className="min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="text-5xl mb-4">:(</div>
          <p className="text-lg font-bold text-[#1A1A1A] mb-2">
            {error ?? "イベントが見つかりませんでした"}
          </p>
          <p className="text-sm text-[#999999] mb-6">
            URLを確認するか、ダッシュボードから操作してください。
          </p>
          <Button
            variant="outline"
            className="rounded-full border-[#E5E5E5] hover:border-[#1A1A1A]/30"
            onClick={() => router.push("/dashboard")}
          >
            ダッシュボードに戻る
          </Button>
        </div>
      </main>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const confirmedCount = bookings.length;
  const capacity = event.capacity;
  const capacityRatio =
    capacity && capacity > 0
      ? Math.min((confirmedCount / capacity) * 100, 100)
      : 0;

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Back navigation */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            aria-label="ダッシュボードに戻る"
            className="h-8 w-8 p-0 rounded-xl text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1
            className="text-lg font-bold text-[#1A1A1A] truncate flex-1"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            参加者一覧
          </h1>
          {bookings.length > 0 && (
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-1.5 shrink-0"
              onClick={() => setMessageOpen(true)}
            >
              <Send className="h-3.5 w-3.5" />
              メッセージ送信
            </Button>
          )}
        </div>

        {/* Event summary card */}
        <div className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden mb-6">
          <div className="p-5">
            <h2
              className="text-base font-bold text-[#1A1A1A] mb-3 leading-snug"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              {event.title}
            </h2>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#999999]">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#1A1A1A]" />
                {formatDate(event.datetime)}
                <span className="text-[#1A1A1A] font-medium">
                  {formatTime(event.datetime)}
                </span>
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#1A1A1A]" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Booking count bar */}
          <div className="border-t border-[#F2F2F2] px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-[#1A1A1A]">
                <Users className="h-4 w-4 text-[#1A1A1A]" />
                予約状況
              </span>
              <span className="text-sm font-bold tabular-nums">
                <span className="text-[#1A1A1A]">{confirmedCount}</span>
                {capacity != null && (
                  <span className="text-[#999999]"> / {capacity}名</span>
                )}
              </span>
            </div>
            {capacity != null && capacity > 0 && (
              <div className="h-2 w-full rounded-full bg-[#F2F2F2] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${capacityRatio}%`,
                    backgroundColor:
                      capacityRatio >= 100 ? "#EF4444" : "#404040",
                  }}
                />
              </div>
            )}
            {capacity != null && confirmedCount >= capacity && (
              <p className="mt-1.5 text-xs font-medium text-[#EF4444]">
                満席です
              </p>
            )}
          </div>
        </div>

        {/* Attendees list */}
        {bookings.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl bg-white border border-[#E5E5E5] p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2F2F2]">
              <UserX className="h-6 w-6 text-[#999999]" />
            </div>
            <p
              className="text-base font-bold text-[#1A1A1A] mb-1"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              まだ予約がありません
            </p>
            <p className="text-sm text-[#999999] leading-relaxed">
              イベントページを共有して、参加者を募りましょう。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column header (desktop) */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-5 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#999999]">
                名前
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#999999]">
                連絡先
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#999999]">
                電話番号
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#999999]">
                予約日
              </span>
            </div>

            {/* Attendee rows */}
            {bookings.map((booking, index) => (
              <div
                key={booking.id}
                className="rounded-2xl bg-white border border-[#E5E5E5] px-5 py-4 transition-colors hover:border-[#1A1A1A]/20"
              >
                {/* Mobile layout */}
                <div className="sm:hidden space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#1A1A1A] shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-sm font-bold text-[#1A1A1A]">
                        {booking.guest_name}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-[#999999]">
                      <Clock className="h-3 w-3" />
                      {formatBookingDate(booking.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 pl-[42px]">
                    <span className="flex items-center gap-1.5 text-xs text-[#999999]">
                      <Mail className="h-3 w-3" />
                      {booking.guest_email}
                    </span>
                    {booking.guest_phone && (
                      <span className="flex items-center gap-1.5 text-xs text-[#999999]">
                        <Phone className="h-3 w-3" />
                        {booking.guest_phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#1A1A1A] shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-[#1A1A1A] truncate">
                      {booking.guest_name}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm text-[#999999] min-w-0 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {booking.guest_email}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-[#999999] w-32">
                    {booking.guest_phone ? (
                      <>
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {booking.guest_phone}
                      </>
                    ) : (
                      <span className="text-[#E5E5E5]">--</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#999999] w-28 justify-end">
                    <Clock className="h-3 w-3" />
                    {formatBookingDate(booking.created_at)}
                  </span>
                </div>
              </div>
            ))}

            {/* Summary footer */}
            <div className="pt-2 px-5 text-right">
              <span className="text-xs text-[#999999]">
                {confirmedCount}件の予約
              </span>
            </div>
          </div>
        )}

        {/* Message dialog */}
        {event && (
          <MessageDialog
            eventId={eventId}
            eventTitle={event.title}
            eventDate={formatDate(event.datetime)}
            eventLocation={event.location ?? ""}
            recipientCount={bookings.length}
            open={messageOpen}
            onClose={() => setMessageOpen(false)}
          />
        )}
      </div>
    </main>
  );
}
