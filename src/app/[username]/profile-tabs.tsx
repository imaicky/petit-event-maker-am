"use client";

import { useState } from "react";
import { PublicEventCard } from "./page";
import type { Event } from "@/types/database";

type EventWithBookings = Event & { booking_count: number };

type TabKey = "upcoming" | "past";

export function ProfileTabs({
  upcomingEvents,
  pastEvents,
  upcomingCount,
  pastCount,
}: {
  upcomingEvents: EventWithBookings[];
  pastEvents: EventWithBookings[];
  upcomingCount: number;
  pastCount: number;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "upcoming", label: "開催予定", count: upcomingCount },
    { key: "past", label: "過去のイベント", count: pastCount },
  ];

  const events = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl bg-[#F2F2F2] p-1 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ${
              activeTab === t.key
                ? "bg-white text-[#1A1A1A] shadow-sm"
                : "text-[#999999] hover:text-[#1A1A1A]"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs font-bold transition-colors duration-300 ${
                  activeTab === t.key
                    ? "bg-[#1A1A1A] text-white"
                    : "bg-[#E5E5E5] text-[#999999]"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event grid */}
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E5E5] py-16 text-center">
          <p className="text-[#999999] text-sm">
            {activeTab === "upcoming"
              ? "現在公開中のイベントはありません"
              : "過去のイベントはありません"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <PublicEventCard
              key={event.id}
              event={event}
              isPast={activeTab === "past"}
            />
          ))}
        </div>
      )}
    </>
  );
}
