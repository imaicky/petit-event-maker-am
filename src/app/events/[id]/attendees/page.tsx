"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Mail,
  Phone,
  Clock,
  UserX,
  Send,
  Download,
  CheckSquare,
  UserCheck,
  Pencil,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { MessageDialog } from "@/components/message-dialog";
import { BookingEditDialog } from "@/components/booking-edit-dialog";
import { BookingCancelDialog } from "@/components/booking-cancel-dialog";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

// ─── Types ───────────────────────────────────────────────────────────────────

type Event = Database["public"]["Tables"]["events"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TZ = "Asia/Tokyo";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      timeZone: TZ,
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
      timeZone: TZ,
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
      timeZone: TZ,
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
  const [updatingAttendance, setUpdatingAttendance] = useState<string | null>(null);
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [waitlistedBookings, setWaitlistedBookings] = useState<Booking[]>([]);
  const [showCancelled, setShowCancelled] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);

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

      // Check if current user is the creator, co-admin, or super-admin
      const SUPER_ADMIN_EMAILS = ["imatoru@gmail.com"];
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email ?? "");

      if (eventData.creator_id !== user.id && !isSuperAdmin) {
        // Check co-admin status
        const { data: adminRecord } = await supabase
          .from("event_admins")
          .select("id")
          .eq("event_id", eventId)
          .eq("user_id", user.id)
          .eq("status", "accepted")
          .maybeSingle();

        if (!adminRecord) {
          router.replace("/");
          return;
        }
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

      // Fetch waitlisted bookings
      const { data: waitlistedData } = await supabase
        .from("bookings")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "waitlisted")
        .order("created_at", { ascending: true });

      setWaitlistedBookings(waitlistedData ?? []);

      // Fetch cancelled bookings
      const { data: cancelledData } = await supabase
        .from("bookings")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "cancelled")
        .order("created_at", { ascending: true });

      setCancelledBookings(cancelledData ?? []);
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

  // ── Attendance toggle ──────────────────────────────────────────────────

  async function toggleAttendance(bookingId: string, current: boolean | null) {
    const next = current === true ? null : true;
    setUpdatingAttendance(bookingId);

    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, attended: next }),
      });

      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, attended: next } : b))
        );
      }
    } catch {
      // silently fail
    } finally {
      setUpdatingAttendance(null);
    }
  }

  async function markAllAttended() {
    const ids = bookings.filter((b) => b.attended !== true).map((b) => b.id);
    if (ids.length === 0) return;

    setUpdatingAttendance("all");

    try {
      const res = await fetch(`/api/events/${eventId}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_ids: ids, attended: true }),
      });

      if (res.ok) {
        setBookings((prev) => prev.map((b) => ({ ...b, attended: true })));
      }
    } catch {
      // silently fail
    } finally {
      setUpdatingAttendance(null);
    }
  }

  // ── CSV download (client-side generation) ──────────────────────────────

  function handleCsvDownload() {
    const header = ["番号", "お名前", "メールアドレス", "電話番号", "出欠", "申込日時"];
    const csvRows = bookings.map((b, i) => [
      String(i + 1),
      b.guest_name,
      b.guest_email,
      b.guest_phone ?? "",
      b.attended === true ? "出席" : b.attended === false ? "欠席" : "未記録",
      new Date(b.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
    ]);

    const csvContent = [header, ...csvRows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const safeTitle = (event?.title ?? "イベント").replace(/[^a-zA-Z0-9\u3000-\u9FFF]/g, "_").slice(0, 30);
    const filename = `${safeTitle}_参加者一覧.csv`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

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
  const attendedCount = bookings.filter((b) => b.attended === true).length;
  const isPaidEvent = (event.price ?? 0) > 0 && ((event as Record<string, unknown>).payment_method ?? 'stripe') === 'stripe';

  function PaymentBadge({ status }: { status: string | null | undefined }) {
    if (!isPaidEvent) return null;
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            支払済
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
            未払い
          </span>
        );
      case "refunded":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            返金済
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
            決済失敗
          </span>
        );
      default:
        return null;
    }
  }

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
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/events/${eventId}/edit`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 text-xs font-medium text-[#1A1A1A] hover:border-[#1A1A1A]/30 hover:bg-[#F7F7F7] transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">イベント編集</span>
            </a>
            {bookings.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCsvDownload}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 text-xs font-medium text-[#1A1A1A] hover:border-[#1A1A1A]/30 hover:bg-[#F7F7F7] transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-1.5"
                  onClick={() => setMessageOpen(true)}
                >
                  <Send className="h-3.5 w-3.5" />
                  メッセージ送信
                </Button>
              </>
            )}
          </div>
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
          <div className="space-y-1">
            {/* Attendance stats + bulk action */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-1.5 text-sm text-[#999999]">
                <UserCheck className="h-4 w-4" />
                出席:
                <span className="font-bold text-[#1A1A1A] tabular-nums">
                  {attendedCount}/{confirmedCount}名
                </span>
              </span>
              {attendedCount < confirmedCount && (
                <button
                  type="button"
                  onClick={markAllAttended}
                  disabled={updatingAttendance === "all"}
                  className="flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#1A1A1A] hover:border-[#1A1A1A]/30 hover:bg-[#F7F7F7] transition-colors disabled:opacity-50"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  全員出席
                </button>
              )}
            </div>

            {/* Column header (desktop) */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-3 px-4 py-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#999999] w-8">
                出欠
              </span>
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
              <span className="text-xs font-bold uppercase tracking-wider text-[#999999] w-16">
                操作
              </span>
            </div>

            {/* Attendee rows */}
            {bookings.map((booking, index) => (
              <div
                key={booking.id}
                className={`rounded-xl bg-white border px-4 py-2.5 transition-colors hover:border-[#1A1A1A]/20 ${
                  booking.attended === true
                    ? "border-green-200 bg-green-50/30"
                    : "border-[#E5E5E5]"
                }`}
              >
                {/* Mobile layout */}
                <div className="sm:hidden space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => toggleAttendance(booking.id, booking.attended)}
                        disabled={updatingAttendance !== null}
                        className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 transition-colors ${
                          booking.attended === true
                            ? "bg-green-600 text-white"
                            : "bg-[#F2F2F2] text-[#1A1A1A] hover:bg-[#E5E5E5]"
                        } ${updatingAttendance !== null ? "opacity-50" : ""}`}
                        aria-label={booking.attended === true ? "出席取消" : "出席にする"}
                      >
                        {booking.attended === true ? (
                          <UserCheck className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{index + 1}</span>
                        )}
                      </button>
                      <span className="text-sm font-bold text-[#1A1A1A]">
                        {booking.guest_name}
                      </span>
                      <PaymentBadge status={booking.payment_status} />
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
                  <div className="flex gap-2 pl-[42px]">
                    <button
                      type="button"
                      onClick={() => setEditBooking(booking)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E5E5] px-2 py-1 text-xs text-[#999999] hover:text-[#1A1A1A] hover:border-[#1A1A1A]/30 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelBooking(booking)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2 py-1 text-xs text-red-400 hover:text-red-500 hover:border-red-200 transition-colors"
                    >
                      <UserX className="h-3 w-3" />
                      キャンセル
                    </button>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => toggleAttendance(booking.id, booking.attended)}
                    disabled={updatingAttendance !== null}
                    className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 transition-colors ${
                      booking.attended === true
                        ? "bg-green-600 text-white"
                        : "bg-[#F2F2F2] text-[#1A1A1A] hover:bg-[#E5E5E5]"
                    } ${updatingAttendance !== null ? "opacity-50" : ""}`}
                    aria-label={booking.attended === true ? "出席取消" : "出席にする"}
                  >
                    {booking.attended === true ? (
                      <UserCheck className="h-3 w-3" />
                    ) : (
                      <span className="text-[11px] font-bold">{index + 1}</span>
                    )}
                  </button>
                  <span className="text-[13px] font-medium text-[#1A1A1A] truncate min-w-0 flex items-center gap-1.5">
                    {booking.guest_name}
                    <PaymentBadge status={booking.payment_status} />
                  </span>
                  <span className="flex items-center gap-1 text-[13px] text-[#999999] min-w-0 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {booking.guest_email}
                  </span>
                  <span className="flex items-center gap-1 text-[13px] text-[#999999] w-28">
                    {booking.guest_phone ? (
                      <>
                        <Phone className="h-3 w-3 shrink-0" />
                        {booking.guest_phone}
                      </>
                    ) : (
                      <span className="text-[#E5E5E5]">--</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#999999] w-24 justify-end">
                    <Clock className="h-2.5 w-2.5" />
                    {formatBookingDate(booking.created_at)}
                  </span>
                  <div className="flex items-center gap-0.5 w-16 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditBooking(booking)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] transition-colors"
                      aria-label="編集"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelBooking(booking)}
                      className="flex h-6 w-6 items-center justify-center rounded text-[#999999] hover:bg-red-50 hover:text-red-500 transition-colors"
                      aria-label="キャンセル"
                    >
                      <UserX className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Summary footer */}
            <div className="pt-1 px-4 text-right">
              <span className="text-xs text-[#999999]">
                {confirmedCount}件の予約
              </span>
            </div>
          </div>
        )}

        {/* Waitlisted bookings section */}
        {waitlistedBookings.length > 0 && (
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[#FF8C00] mb-2 px-2">
              <Clock className="h-4 w-4" />
              キャンセル待ち ({waitlistedBookings.length}名)
            </h3>
            <div className="space-y-2">
              {waitlistedBookings.map((wlBooking, index) => (
                <div
                  key={wlBooking.id}
                  className="rounded-2xl border border-[#FF8C00]/20 bg-[#FF8C00]/5 px-5 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF8C00]/20 text-[#FF8C00] shrink-0">
                        <span className="text-xs font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          {wlBooking.guest_name}
                        </span>
                        <span className="ml-2 text-xs text-[#999999]">
                          {wlBooking.guest_email}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#999999]">
                        {formatBookingDate(wlBooking.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCancelBooking(wlBooking)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2 py-1 text-xs text-red-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      >
                        <UserX className="h-3 w-3" />
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancelled bookings section */}
        {cancelledBookings.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowCancelled((v) => !v)}
              className="flex items-center gap-2 text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mb-2"
            >
              {showCancelled ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              キャンセル済み ({cancelledBookings.length}件)
            </button>
            {showCancelled && (
              <div className="space-y-2">
                {cancelledBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] px-5 py-3 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-400 shrink-0">
                        <UserX className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm text-[#999999] line-through">
                        {booking.guest_name}
                      </span>
                      <span className="text-xs text-[#999999]">
                        {booking.guest_email}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        {/* Booking edit dialog */}
        {editBooking && (
          <BookingEditDialog
            eventId={eventId}
            booking={editBooking}
            open={!!editBooking}
            onClose={() => setEditBooking(null)}
            onSaved={(updated) => {
              setBookings((prev) =>
                prev.map((b) =>
                  b.id === editBooking.id
                    ? { ...b, ...updated }
                    : b
                )
              );
            }}
          />
        )}

        {/* Booking cancel dialog */}
        {cancelBooking && (
          <BookingCancelDialog
            eventId={eventId}
            booking={cancelBooking}
            open={!!cancelBooking}
            onClose={() => setCancelBooking(null)}
            onCancelled={() => {
              const wasConfirmed = cancelBooking.status === "confirmed";
              const wasWaitlisted = cancelBooking.status === "waitlisted";

              // Move to cancelled list
              setCancelledBookings((prev) => [
                ...prev,
                { ...cancelBooking, status: "cancelled" },
              ]);

              if (wasConfirmed) {
                setBookings((prev) =>
                  prev.filter((b) => b.id !== cancelBooking.id)
                );
                // Auto-promote: move first waitlisted to confirmed
                if (waitlistedBookings.length > 0) {
                  const promoted = waitlistedBookings[0];
                  setWaitlistedBookings((prev) => prev.slice(1));
                  setBookings((prev) => [
                    ...prev,
                    { ...promoted, status: "confirmed" },
                  ]);
                }
              } else if (wasWaitlisted) {
                setWaitlistedBookings((prev) =>
                  prev.filter((b) => b.id !== cancelBooking.id)
                );
              }
            }}
          />
        )}
      </div>
    </main>
  );
}
