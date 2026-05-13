import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, User, Video, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { AverageRatingBadge } from "@/components/average-rating-badge";
import { SoldOutStamp } from "@/components/sold-out-stamp";

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
  /** お気に入り登録数（>0 で表示）*/
  favorite_count?: number;
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
  favorite_count = 0,
  className,
}: EventCardProps) {
  const remaining = capacity - booked_count;
  const isFull = capacity > 0 && remaining <= 0;
  const isLow = !isFull && remaining > 0 && remaining <= 3;
  const isPast = new Date(datetime).getTime() < Date.now();
  const { date, time } = formatDateShort(datetime);
  const isFree = price === 0;

  return (
    <Link
      href={short_code ? `/e/${short_code}` : `/events/${id}`}
      aria-label={isPast ? `${title}（終了したイベント）` : title}
      className={cn(
        "group block overflow-hidden rounded-2xl bg-white",
        "card-hover-tilt",
        "shadow-sm ring-1 ring-[#E5E5E5]/60",
        "transition-all duration-300",
        "hover:shadow-lg hover:ring-2 hover:ring-[#1A1A1A]/20",
        isPast && "opacity-70 hover:opacity-90",
        className
      )}
    >
      {/* Image area with shine effect */}
      <div
        className={cn(
          "shine-on-hover relative h-44 w-full overflow-hidden bg-[#F2F2F2]",
          isPast && "grayscale"
        )}
      >
        {image_url ? (
          <Image
            src={image_url}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
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

        {/* 満員御礼 stamp — center, prominently shown when sold out and not past */}
        {isFull && !isPast && (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
            <SoldOutStamp size="md" rotateDeg={-10} />
          </div>
        )}

        {/* Past event overlay */}
        {isPast && (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-black/15">
            <span className="rounded-md bg-[#1A1A1A]/85 px-4 py-1.5 text-sm font-bold tracking-widest text-white shadow-md">
              終了
            </span>
          </div>
        )}

        {/* Category badge - frosted glass */}
        {category && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex h-5 items-center rounded-full bg-white/80 px-2.5 text-xs font-medium text-[#1A1A1A] shadow-sm ring-1 ring-white/30 backdrop-blur-sm">
              {category}
            </span>
          </div>
        )}

        {/* Availability badge */}
        <div className="absolute right-3 top-3">
          {isPast ? (
            <span className="inline-flex items-center rounded-full bg-[#666666]/80 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              終了
            </span>
          ) : isFull ? (
            <span className="inline-flex items-center rounded-full bg-[#B91C1C]/90 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              満員御礼
            </span>
          ) : isLow ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FF8C00]/90 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" /></span>
              残りわずか
            </span>
          ) : capacity > 0 ? (
            <span className="inline-flex items-center rounded-full bg-[#404040]/80 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              受付中
            </span>
          ) : null}
        </div>
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
                <Video className="h-3.5 w-3.5 shrink-0 text-sky-600" />
                <span className="truncate">オンライン</span>
              </>
            ) : (location_type === "hybrid") ? (
              <>
                <span className="flex items-center gap-0.5 shrink-0">
                  <MapPin className="h-3 w-3 text-amber-600" />
                  <Video className="h-3 w-3 text-sky-600" />
                </span>
                <span className="truncate font-medium text-amber-700">ハイブリッド</span>
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

        {/* Capacity + Favorite count */}
        {(capacity > 0 || favorite_count > 0) && (
          <div className="mb-3 flex items-center gap-3">
            {capacity > 0 && (
              <span className="text-xs text-[#999999]">定員{capacity}名</span>
            )}
            {favorite_count > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs text-rose-500">
                <Heart className="h-3 w-3 fill-rose-500" />
                {favorite_count}
              </span>
            )}
          </div>
        )}

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
