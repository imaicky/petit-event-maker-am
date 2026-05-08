"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

export type CalendarEvent = {
  id: string;
  title: string;
  datetime: string;
  short_code?: string | null;
  category?: string | null;
  category_name?: string | null;
  is_full?: boolean;
  is_free?: boolean;
  location_type?: string | null;
};

interface EventCalendarProps {
  eventsByDate: Record<string, CalendarEvent[]>;
  selectedDate?: string;
  currentMonth: string; // "YYYY-MM"
  baseParams: Record<string, string>;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// Subtle category color dots (uses design-system terracotta + neutrals)
const CATEGORY_DOT: Record<string, string> = {
  "LLM活用": "bg-[#C26A4A]",
  "画像生成": "bg-[#7E5BB0]",
  "動画生成・編集": "bg-[#5B8DB0]",
  "音声・音楽": "bg-[#5BB07E]",
  "プロンプトエンジニアリング": "bg-[#B0935B]",
  "AI開発・実装": "bg-[#1A1A1A]",
  "AI×ビジネス": "bg-[#666666]",
  "AI×クリエイティブ": "bg-[#C26A4A]",
  "AIコミュニティ・座談会": "bg-[#999999]",
  "ライフスタイル": "bg-[#88A05B]",
};

function buildHref(
  baseParams: Record<string, string>,
  extra: Record<string, string>
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...baseParams, ...extra })) {
    if (v) params.set(k, v);
  }
  return `/explore?${params.toString()}`;
}

function eventHref(e: CalendarEvent): string {
  return e.short_code ? `/e/${e.short_code}` : `/events/${e.id}`;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return "";
  }
}

export function EventCalendar({
  eventsByDate,
  selectedDate,
  currentMonth,
  baseParams,
}: EventCalendarProps) {
  const [yearStr, monthStr] = currentMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12

  const firstDay = new Date(year, month - 1, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  // Previous/next month strings
  const prevDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
  })();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#1A1A1A]" />
          <h3 className="text-sm font-bold tabular-nums text-[#1A1A1A]">
            {year}年 {month}月
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={buildHref(baseParams, { view: "calendar", month: prevMonth })}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666666] hover:bg-white hover:text-[#1A1A1A] transition-colors"
            aria-label="前月"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={buildHref(baseParams, { view: "calendar", month: thisMonth })}
            className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-[#666666] hover:bg-white hover:text-[#1A1A1A] transition-colors"
          >
            今月
          </Link>
          <Link
            href={buildHref(baseParams, { view: "calendar", month: nextMonth })}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#666666] hover:bg-white hover:text-[#1A1A1A] transition-colors"
            aria-label="次月"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[#E5E5E5] bg-[#FAFAFA]">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-xs font-medium py-2 ${
              i === 0
                ? "text-red-500/80"
                : i === 6
                ? "text-blue-500/80"
                : "text-[#666666]"
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 divide-x divide-[#F0F0F0]">
        {cells.map((day, i) => {
          const rowEnd = (i + 1) % 7 === 0;
          const cellBorder = rowEnd ? "" : "";
          if (day === null) {
            return (
              <div
                key={`empty-${i}`}
                className={`min-h-[120px] sm:min-h-[140px] bg-[#FAFAFA] ${cellBorder} border-b border-[#F0F0F0]`}
              />
            );
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const events = eventsByDate[dateStr] ?? [];
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          const dow = i % 7;
          const dayColor =
            dow === 0
              ? "text-red-500/80"
              : dow === 6
              ? "text-blue-500/80"
              : "text-[#1A1A1A]";

          return (
            <div
              key={dateStr}
              className={`min-h-[120px] sm:min-h-[140px] border-b border-[#F0F0F0] p-1.5 transition-colors ${
                isSelected
                  ? "bg-[#FAF1ED]"
                  : isToday
                  ? "bg-[#FFFCF7]"
                  : "bg-white hover:bg-[#FAFAFA]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <Link
                  href={buildHref(baseParams, {
                    view: "calendar",
                    month: currentMonth,
                    date: dateStr,
                  })}
                  className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded text-xs font-bold tabular-nums ${dayColor} ${
                    isToday
                      ? "bg-[#1A1A1A] text-white px-1"
                      : ""
                  } ${isSelected ? "bg-[#C26A4A] text-white px-1" : ""} hover:underline`}
                  aria-label={`${day}日のイベントを表示`}
                >
                  {day}
                </Link>
                {events.length > 0 && (
                  <span className="rounded-full bg-[#1A1A1A]/5 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-[#666666]">
                    {events.length}
                  </span>
                )}
              </div>

              {events.length > 0 && (
                <ul className="space-y-0.5 max-h-[100px] overflow-y-auto pr-0.5 scrollbar-hide">
                  {events.map((ev) => {
                    const cat = ev.category_name ?? ev.category ?? "";
                    const dot = CATEGORY_DOT[cat] ?? "bg-[#999999]";
                    const time = formatTime(ev.datetime);
                    return (
                      <li key={ev.id}>
                        <Link
                          href={eventHref(ev)}
                          title={`${time ? `${time} · ` : ""}${ev.title}`}
                          className={`group flex items-start gap-1 rounded px-1 py-0.5 text-[10px] leading-tight hover:bg-white hover:shadow-sm transition-colors ${
                            ev.is_full ? "opacity-60" : ""
                          }`}
                        >
                          <span
                            className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            {time && (
                              <span className="mr-1 tabular-nums text-[#999999]">
                                {time}
                              </span>
                            )}
                            <span className="text-[#1A1A1A] group-hover:underline">
                              {ev.title}
                            </span>
                            {ev.is_full && (
                              <span className="ml-1 text-[9px] text-red-500">
                                満員
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: selected date detail / clear */}
      {selectedDate && (
        <div className="border-t border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2 text-center">
          <Link
            href={buildHref(baseParams, { view: "calendar", month: currentMonth })}
            className="text-xs text-[#666666] hover:text-[#1A1A1A] transition-colors"
          >
            日付フィルターを解除
          </Link>
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#666666]">
          <span className="font-medium text-[#1A1A1A]">カテゴリ:</span>
          {Object.entries(CATEGORY_DOT).slice(0, 6).map(([name, color]) => (
            <span key={name} className="inline-flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
