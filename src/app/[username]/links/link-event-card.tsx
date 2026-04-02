import Link from "next/link";
import { Calendar, MapPin, Video } from "lucide-react";
import type { Event } from "@/types/database";

type EventWithBookings = Event & { booking_count: number };

function formatDateCompact(dt: string) {
  try {
    const d = new Date(dt);
    return d.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return dt;
  }
}

export function LinkEventCard({ event }: { event: EventWithBookings }) {
  const spotsLeft = event.capacity ? event.capacity - event.booking_count : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-3 transition-all active:scale-[0.98] hover:border-[#1A1A1A]/30 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#F2F2F2] to-[#E0E0E0]">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl opacity-70">
            🎉
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-center gap-1.5 min-w-0">
        <h3
          className="text-sm font-bold text-[#1A1A1A] leading-snug line-clamp-2"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          {event.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-[#999999]">
          <Calendar className="h-3 w-3 text-[#1A1A1A] shrink-0" />
          <span>{formatDateCompact(event.datetime)}</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {(event.location_type === "online") ? (
            <span className="flex items-center gap-1 text-[#999999] truncate">
              <Video className="h-3 w-3 text-[#1A1A1A] shrink-0" />
              <span className="truncate">オンライン</span>
            </span>
          ) : (event.location_type === "hybrid") ? (
            <span className="flex items-center gap-1 text-[#999999] truncate">
              <Video className="h-3 w-3 text-[#1A1A1A] shrink-0" />
              <span className="truncate">対面 + オンライン</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#999999] truncate">
              <MapPin className="h-3 w-3 text-[#1A1A1A] shrink-0" />
              <span className="truncate">対面</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Price */}
          <span className="font-bold text-[#1A1A1A]">
            {(event.price ?? 0) === 0
              ? "無料"
              : `¥${(event.price ?? 0).toLocaleString("ja-JP")}`}
          </span>

          {/* Full indicator only */}
          {isFull && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#F2F2F2] text-[#999999]">
              満員
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
