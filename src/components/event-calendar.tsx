"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface EventCalendarProps {
  eventCountByDate: Record<string, number>; // "YYYY-MM-DD" -> count
  selectedDate?: string;
  currentMonth: string; // "YYYY-MM"
  baseParams: Record<string, string>;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

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

export function EventCalendar({
  eventCountByDate,
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

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={buildHref(baseParams, { view: "calendar", month: prevMonth })}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] transition-colors"
          aria-label="前月"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h3 className="text-sm font-bold text-[#1A1A1A]">
          {year}年{month}月
        </h3>
        <Link
          href={buildHref(baseParams, { view: "calendar", month: nextMonth })}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] transition-colors"
          aria-label="次月"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-[10px] font-medium py-1 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-[#999999]"
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = eventCountByDate[dateStr] ?? 0;
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr;
          const dow = i % 7;

          if (isSelected) {
            return (
              <Link
                key={dateStr}
                href={buildHref(baseParams, { view: "calendar", month: currentMonth })}
                className="aspect-square flex flex-col items-center justify-center rounded-lg bg-[#1A1A1A] text-white transition-colors"
              >
                <span className="text-sm font-bold">{day}</span>
                {count > 0 && (
                  <span className="mt-0.5 flex h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          }

          if (count > 0) {
            return (
              <Link
                key={dateStr}
                href={buildHref(baseParams, {
                  view: "calendar",
                  month: currentMonth,
                  date: dateStr,
                })}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg hover:bg-[#F2F2F2] transition-colors ${
                  isToday ? "ring-1 ring-[#1A1A1A]/30" : ""
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-[#1A1A1A]"
                  }`}
                >
                  {day}
                </span>
                <span className="mt-0.5 flex h-1.5 w-1.5 rounded-full bg-[#1A1A1A]" />
              </Link>
            );
          }

          return (
            <div
              key={dateStr}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg ${
                isToday ? "ring-1 ring-[#1A1A1A]/30" : ""
              }`}
            >
              <span
                className={`text-sm ${
                  dow === 0 ? "text-red-300" : dow === 6 ? "text-blue-300" : "text-[#999999]"
                }`}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected date clear link */}
      {selectedDate && (
        <div className="mt-3 pt-3 border-t border-[#F2F2F2] text-center">
          <Link
            href={buildHref(baseParams, { view: "calendar", month: currentMonth })}
            className="text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
          >
            日付フィルターを解除
          </Link>
        </div>
      )}
    </div>
  );
}
