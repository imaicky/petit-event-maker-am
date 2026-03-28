import Link from "next/link";
import { Calendar, TrendingUp } from "lucide-react";
import type { EventWithBookingCount } from "@/types/database";
import { AverageRatingBadge } from "@/components/average-rating-badge";

interface TrendingEventsProps {
  events: EventWithBookingCount[];
  reviewAggs: Record<string, { averageRating: number; reviewCount: number }>;
}

export function TrendingEvents({ events, reviewAggs }: TrendingEventsProps) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-[#1A1A1A]" />
        <h2 className="text-base font-bold text-[#1A1A1A]">注目のイベント</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
        {events.map((event) => {
          const dateStr = (() => {
            try {
              return new Date(event.datetime).toLocaleDateString("ja-JP", {
                month: "short",
                day: "numeric",
                weekday: "short",
              });
            } catch {
              return "";
            }
          })();
          const agg = reviewAggs[event.id];

          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group flex-none w-[260px] snap-start"
            >
              <div className="rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-[#1A1A1A]/30 transition-all duration-200">
                {/* Image */}
                <div className="h-32 relative overflow-hidden bg-gradient-to-br from-[#F2F2F2] to-[#E0E0E0]">
                  {event.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-4xl opacity-60">🎉</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  {/* Trending badge */}
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-2 py-0.5 text-[10px] font-bold text-white">
                      <TrendingUp className="h-2.5 w-2.5" />
                      人気
                    </span>
                  </div>
                  {/* Price */}
                  <div className="absolute top-2 right-2">
                    <span className="inline-block rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-xs font-bold text-[#1A1A1A]">
                      {event.price === 0
                        ? "無料"
                        : `¥${event.price.toLocaleString("ja-JP")}`}
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="text-sm font-bold text-[#1A1A1A] line-clamp-1 leading-snug mb-1.5">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-[#999999] mb-1">
                    <Calendar className="h-3 w-3 text-[#1A1A1A] shrink-0" />
                    <span>{dateStr}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#999999]">
                      {event.booking_count}名申込み
                    </span>
                    {agg && agg.reviewCount > 0 && (
                      <AverageRatingBadge
                        averageRating={agg.averageRating}
                        reviewCount={agg.reviewCount}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
