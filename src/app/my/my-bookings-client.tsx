"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type BookingStatus = "confirmed" | "cancelled";

export type BookingItem = {
  id: string;
  event_id: string;
  status: BookingStatus;
  created_at: string;
  event: {
    id: string;
    title: string;
    datetime: string;
    location: string | null;
    location_type: string | null;
    online_url: string | null;
    location_url: string | null;
    slug: string;
  };
};

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

function formatBookedAt(dt: string) {
  try {
    return new Date(dt).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dt;
  }
}

function isUpcoming(dt: string) {
  return new Date(dt) > new Date();
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  onCancelled,
}: {
  booking: BookingItem;
  onCancelled: (bookingId: string) => void;
}) {
  const upcoming = isUpcoming(booking.event.datetime);
  const isCancelled = booking.status === "cancelled";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${booking.event.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "キャンセルに失敗しました");
        return;
      }
      setDialogOpen(false);
      onCancelled(booking.id);
    } catch {
      setError("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setCancelling(false);
    }
  };

  const statusConfig = isCancelled
    ? {
        badge: "キャンセル済み",
        badgeClass: "bg-red-50 text-red-400 border border-red-100",
        cardClass: "border-[#E5E5E5] opacity-60",
        dateClass: "bg-[#F2F2F2] text-[#999999]",
      }
    : upcoming
    ? {
        badge: "参加予定",
        badgeClass: "bg-[#404040]/10 text-[#404040] border border-[#404040]/20",
        cardClass: "border-[#E5E5E5] hover:border-[#1A1A1A]/30 hover:shadow-md",
        dateClass: "bg-[#F7F7F7] text-[#1A1A1A]",
      }
    : {
        badge: "終了済み",
        badgeClass: "bg-[#F2F2F2] text-[#999999] border border-[#E5E5E5]",
        cardClass: "border-[#E5E5E5]",
        dateClass: "bg-[#F2F2F2] text-[#999999]",
      };

  return (
    <>
      <div
        className={`rounded-2xl border bg-white p-4 transition-all ${statusConfig.cardClass}`}
      >
        <div className="flex items-start gap-3">
          {/* Date block */}
          <div
            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-center ${statusConfig.dateClass}`}
          >
            <span className="text-xs font-medium leading-none">
              {new Date(booking.event.datetime).toLocaleDateString("ja-JP", {
                month: "numeric",
                timeZone: "Asia/Tokyo",
              })}
              月
            </span>
            <span className="mt-0.5 text-xl font-bold leading-none">
              {new Date(booking.event.datetime).toLocaleDateString("ja-JP", {
                day: "numeric",
                timeZone: "Asia/Tokyo",
              })}
            </span>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.badgeClass}`}
              >
                {statusConfig.badge}
              </span>
            </div>

            <Link href={`/events/${booking.event.id}`} className="group block">
              <h3 className="text-sm font-bold leading-snug text-[#1A1A1A] line-clamp-2 group-hover:text-[#1A1A1A] transition-colors flex items-center gap-0.5">
                {booking.event.title}
                <ChevronRight className="ml-0.5 inline h-3.5 w-3.5 text-[#999999] group-hover:text-[#1A1A1A] shrink-0" />
              </h3>
            </Link>

            <div className="mt-2 space-y-1 text-xs text-[#999999]">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 shrink-0 text-[#1A1A1A]" />
                <span>{formatDatetime(booking.event.datetime)}</span>
              </div>
              {(booking.event.location_type === "physical" || booking.event.location_type === "hybrid" || !booking.event.location_type) && booking.event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0 text-[#1A1A1A]" />
                  <span className="truncate">{booking.event.location}</span>
                  {booking.event.location_url && (
                    <a
                      href={booking.event.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      地図
                    </a>
                  )}
                </div>
              )}
              {(booking.event.location_type === "online" || booking.event.location_type === "hybrid") && (
                <div className="flex items-center gap-1.5">
                  <Video className="h-3 w-3 shrink-0 text-[#1A1A1A]" />
                  {booking.event.online_url ? (
                    <a
                      href={booking.event.online_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      参加リンクを開く
                    </a>
                  ) : (
                    <span className="truncate">オンライン</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#F2F2F2] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-[#999999]">
            <Clock className="h-3 w-3" />
            <span>{formatBookedAt(booking.created_at)}に申し込み</span>
          </div>

          {upcoming && !isCancelled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="h-7 rounded-lg border-red-200 px-3 text-xs text-red-400 hover:bg-red-50 hover:border-red-300"
            >
              キャンセル
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約をキャンセルしますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#999999]">
            以下のイベントの予約をキャンセルします。この操作は取り消せません。
          </p>
          <div className="rounded-xl bg-[#FAFAFA] p-4 text-sm">
            <p className="font-bold text-[#1A1A1A] line-clamp-2">
              {booking.event.title}
            </p>
            <p className="mt-1 text-xs text-[#999999]">
              {formatDatetime(booking.event.datetime)}
            </p>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl border-[#E5E5E5]"
              onClick={() => setDialogOpen(false)}
              disabled={cancelling}
            >
              戻る
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 rounded-xl bg-red-500 text-white hover:bg-red-600"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                "キャンセルする"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: "upcoming" | "past" }) {
  if (tab === "upcoming") {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="relative mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F7F7F7] text-4xl">
            🗓️
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1A1A] text-white">
            <Search className="h-3.5 w-3.5" />
          </div>
        </div>
        <h2
          className="mb-2 text-xl font-bold text-[#1A1A1A]"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          まだ申し込んだイベントはありません
        </h2>
        <p className="mb-8 max-w-xs text-sm leading-relaxed text-[#999999]">
          気になるイベントを見つけて参加してみましょう。
          申し込んだイベントはここで確認できます。
        </p>
        <Link href="/">
          <Button
            size="lg"
            variant="outline"
            className="h-12 rounded-full px-8 border-[#E5E5E5] hover:border-[#1A1A1A]/40 hover:bg-[#F7F7F7]"
          >
            イベントを探す
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-3xl">📖</div>
      <p className="text-sm text-[#999999]">過去のイベント履歴はありません</p>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export function MyBookingsClient({
  initialBookings,
}: {
  initialBookings: BookingItem[];
}) {
  const [bookings, setBookings] = useState<BookingItem[]>(initialBookings);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const handleCancelled = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: "cancelled" as BookingStatus } : b
      )
    );
  };

  const upcomingBookings = bookings.filter(
    (b) => b.status === "confirmed" && isUpcoming(b.event.datetime)
  );
  const pastBookings = bookings.filter(
    (b) => b.status !== "confirmed" || !isUpcoming(b.event.datetime)
  );

  if (bookings.length === 0) {
    return <EmptyState tab="upcoming" />;
  }

  return (
    <div>
      {/* Tab controls */}
      <div className="mb-6 flex gap-1 rounded-2xl bg-[#F2F2F2] p-1">
        {(
          [
            { key: "upcoming" as const, label: "参加予定", count: upcomingBookings.length },
            { key: "past" as const, label: "過去のイベント", count: pastBookings.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-[#999999] hover:text-[#1A1A1A]"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`inline-flex min-w-[1.2rem] items-center justify-center rounded-full px-1 text-xs font-bold ${
                  activeTab === tab.key
                    ? "bg-[#1A1A1A] text-white"
                    : "bg-[#E5E5E5] text-[#999999]"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "upcoming" ? (
        upcomingBookings.length === 0 ? (
          <EmptyState tab="upcoming" />
        ) : (
          <div className="space-y-3">
            {upcomingBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancelled={handleCancelled}
              />
            ))}
          </div>
        )
      ) : pastBookings.length === 0 ? (
        <EmptyState tab="past" />
      ) : (
        <div className="space-y-3">
          {pastBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancelled={handleCancelled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
