import Link from "next/link";
import { Calendar, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EventCardProps {
  id: string;
  title: string;
  datetime: string;
  location: string;
  price: number;
  capacity: number;
  booked_count: number;
  image_url?: string;
  category?: string;
  teacher_name?: string;
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
      }),
      time: d.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
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
  price,
  capacity,
  booked_count,
  image_url,
  category,
  teacher_name,
  className,
}: EventCardProps) {
  const remaining = capacity - booked_count;
  const isAlmostFull = remaining > 0 && remaining <= 3;
  const isFull = remaining <= 0;
  const fillRate = capacity > 0 ? Math.round((booked_count / capacity) * 100) : 0;
  const { date, time } = formatDateShort(datetime);
  const isFree = price === 0;

  return (
    <Link
      href={`/events/${id}`}
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

        {/* Spots badge */}
        <div className="absolute right-3 top-3">
          {isFull ? (
            <span className="inline-flex items-center rounded-full bg-[#1A1A1A]/80 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              {"満員"}
            </span>
          ) : isAlmostFull ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              {"あと"}{remaining}{"名"}
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
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
            <span className="truncate">{location}</span>
          </div>
          {teacher_name && (
            <div className="flex items-center gap-1.5 text-xs text-[#999999]">
              <User className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
              <span className="truncate">{teacher_name}</span>
            </div>
          )}
        </div>

        {/* Fill rate bar - animated from 0 to actual width on load */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-[#999999]">
            <span>
              {isFull ? (
                <span className="font-medium text-[#1A1A1A]">{"満員"}</span>
              ) : (
                <>
                  {"残り"}<span className="font-medium text-[#1A1A1A]">{remaining}</span>{"名"}
                </>
              )}
            </span>
            <span>{capacity}{"名定員"}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EEEEEE]">
            <div
              className={cn(
                "h-full w-0 rounded-full",
                "transition-[width] duration-1000 ease-out",
                isFull
                  ? "bg-[#1A1A1A]"
                  : isAlmostFull
                  ? "bg-[#1A1A1A]"
                  : "bg-[#404040]"
              )}
              style={{
                width: `${Math.min(fillRate, 100)}%`,
                transition: "width 0.8s ease-out",
              }}
            />
          </div>
        </div>

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
