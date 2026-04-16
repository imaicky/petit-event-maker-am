import Link from "next/link";
import {
  Calendar,
  MapPin,
  ArrowRight,
  Video,
} from "lucide-react";
import type { Event } from "@/types/database";

type EventWithBookings = Event & { booking_count: number };

function formatDateShort(dt: string) {
  try {
    return new Date(dt).toLocaleDateString("ja-JP", {
      month: "long",
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

export function PublicEventCard({ event, isPast }: { event: EventWithBookings; isPast?: boolean }) {
  const spotsLeft = event.capacity ? event.capacity - event.booking_count : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isLow = !isFull && spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 3;
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className={`rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden hover:shadow-lg hover:border-[#1A1A1A]/30 transition-all duration-200 ${isPast ? "opacity-75" : ""}`}>
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
          {/* Status badge */}
          <div className="absolute bottom-3 left-3">
            {isPast ? (
              <span className="inline-block rounded-full bg-[#E5E5E5]/90 px-2.5 py-1 text-xs font-bold text-[#999999] backdrop-blur-sm">
                終了
              </span>
            ) : isFull ? (
              <span className="inline-block rounded-full bg-[#E5E5E5]/90 px-2.5 py-1 text-xs font-bold text-[#999999] backdrop-blur-sm">
                満員
              </span>
            ) : isLow ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF8C00]/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" /></span>
                残りわずか
              </span>
            ) : spotsLeft !== null ? (
              <span className="inline-block rounded-full bg-[#404040]/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                受付中
              </span>
            ) : null}
          </div>
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
            {(event.location_type === "online") ? (
              <div className="flex items-center gap-1.5">
                <Video className="h-3 w-3 text-[#1A1A1A] shrink-0" />
                <span className="truncate">オンライン</span>
              </div>
            ) : (event.location_type === "hybrid") ? (
              <div className="flex items-center gap-1.5">
                <Video className="h-3 w-3 text-[#1A1A1A] shrink-0" />
                <span className="truncate">対面 + オンライン</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-[#1A1A1A] shrink-0" />
                <span className="truncate">対面</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-1">
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
