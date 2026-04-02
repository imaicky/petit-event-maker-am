import Link from "next/link";
import { Calendar, MapPin, User, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { AverageRatingBadge } from "@/components/average-rating-badge";

export interface EventCardProps {
  id: string;
  title: string;
  datetime: string;
  location: string;
  location_type?: string | null;
  is_limited?: boolean;
  price: number;
  capacity: number;
  booked_count: number;
  image_url?: string;
  category?: string;
  teacher_name?: string;
  averageRating?: number;
  reviewCount?: number;
  short_code?: string | null;
  className?: string;
}

function formatDateShort(datetimeStr: string): { date: string; time: string } {
  try {
    const d = new Date(datetimeStr);
    return {
      date: d.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
        weekday: "short",
        timeZone: "Asia/Tokyo",
      }),
      time: d.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      }),
    };
  } catch {
    return { date: datetimeStr, time: "" };
  }
}

export function EventCard({
  id,
  title,
  datetime,
  location,
  location_type,
  is_limited,
  price,
  capacity,
  booked_count,
  image_url,
  category,
  teacher_name,
  averageRating,
  reviewCount,
  short_code,
  className,
}: EventCardProps) {
  const remaining = capacity - booked_count;
  const isFull = remaining <= 0;
  const { date, time } = formatDateShort(datetime);
  const isFree = price === 0;

  return (
    <Link
      href={short_code ? `/e/${short_code}` : `/events/${id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl bg-white",
        "card-hover-tilt",
        "shadow-sm ring-1 ring-[#E5E5E5]/60",
        "transition-all duration-300",
        "hover:shadow-lg hover:ring-2 hover:ring-[#1A1A1A]/20",
        className
      )}
    >
      {/* Image area with shine effect */}
      <div className="shine-on-hover relative h-44 w-full overflow-hidden bg-[#F2F2F2]">
        {image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image_url}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#FAFAFA] via-[#F2F2F2] to-[#E0E0E0]">
            {/* Subtle dot pattern */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #1A1A1A 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
            {/* Floating emojis */}
            <div className="relative flex items-center gap-3">
              <span className="animate-fade-in text-3xl opacity-40" style={{ animationDelay: "200ms" }}>
                {"\u2728"}
              </span>
              <span className="animate-scale-in text-5xl drop-shadow-sm">
                {"\uD83C\uDF89"}
              </span>
              <span className="animate-fade-in text-3xl opacity-40" style={{ animationDelay: "400ms" }}>
                {"\u2728"}
              </span>
            </div>
          </div>
        )}

        {/* Gradient overlay - enhanced */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />

        {/* Category badge - frosted glass */}
        {category && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex h-5 items-center rounded-full bg-white/80 px-2.5 text-xs font-medium text-[#1A1A1A] shadow-sm ring-1 ring-white/30 backdrop-blur-sm">
              {category}
            </span>
          </div>
        )}

        {/* Spots badge — only show "満員" to prevent wasted clicks */}
        {isFull && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center rounded-full bg-[#1A1A1A]/80 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              {"満員"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="mb-3 line-clamp-2 text-sm font-bold leading-snug text-[#1A1A1A] transition-colors duration-200 group-hover:text-[#1A1A1A]">
          {title}
        </h3>

        {/* Meta */}
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-[#999999]">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
            <span className="font-medium text-[#555555]">{date}</span>
            {time && <span className="text-[#999999]">{time}{"\u301C"}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#999999]">
            {(location_type === "online") ? (
              <>
                <Video className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
                <span className="truncate">オンライン</span>
              </>
            ) : (location_type === "hybrid") ? (
              <>
                <Video className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
                <span className="truncate">対面 + オンライン</span>
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
                <span className="truncate">対面</span>
              </>
            )}
          </div>
          {teacher_name && (
            <div className="flex items-center gap-1.5 text-xs text-[#999999]">
              <User className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
              <span className="truncate">{teacher_name}</span>
            </div>
          )}
          {averageRating != null && reviewCount != null && reviewCount > 0 && (
            <AverageRatingBadge averageRating={averageRating} reviewCount={reviewCount} />
          )}
        </div>

        {/* Capacity info — show "満員" or just the capacity */}
        {isFull ? (
          <div className="mb-3">
            <span className="text-xs font-medium text-[#1A1A1A]">{"満員"}</span>
          </div>
        ) : capacity > 0 ? (
          <div className="mb-3">
            <span className="text-xs text-[#999999]">{"定員"}{capacity}{"名"}</span>
          </div>
        ) : null}

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-[#1A1A1A]">
            {isFree ? (
              <span className="inline-flex animate-scale-in items-center gap-1">
                <span className="rounded-lg bg-[#404040]/10 px-3 py-1 text-base font-bold text-[#404040] ring-1 ring-[#404040]/20">
                  {"無料"}
                </span>
              </span>
            ) : (
              `\u00A5${price.toLocaleString("ja-JP")}`
            )}
          </span>
          {/* CTA slides in from right on hover */}
          <span className="translate-x-4 rounded-lg bg-[#1A1A1A] px-3 py-1 text-xs font-medium text-white opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100">
            {"詳細を見る"}
          </span>
        </div>
      </div>
    </Link>
  );
}
