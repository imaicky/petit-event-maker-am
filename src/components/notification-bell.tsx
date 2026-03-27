"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, MailOpen, Mail, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

type NotificationType =
  | "booking_confirmation"
  | "new_booking_alert"
  | "booking_reminder"
  | "booking_cancellation";

interface Notification {
  id: string;
  type: NotificationType;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  booking_confirmation: "✅",
  new_booking_alert: "🔔",
  booking_reminder: "⏰",
  booking_cancellation: "❌",
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}時間前`;
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const recent = notifications.slice(0, 5);

  useEffect(() => {
    if (!user) return;

    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const json = await res.json();
        setNotifications(json.notifications ?? []);
      } catch {
        // silent – notification bell is non-critical
      }
    };
    fetchNotifs();
    // Poll every 30s
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`通知 ${unreadCount > 0 ? `(${unreadCount}件の未読)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#1A1A1A] transition-colors hover:bg-[#F2F2F2]"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1A1A1A] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E5E5E5] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1A1A1A]">通知</span>
              {unreadCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1A1A1A] px-1.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A]"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List */}
          {recent.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Bell className="mb-2 h-8 w-8 text-[#E5E5E5]" />
              <p className="text-xs text-[#999999]">通知はありません</p>
            </div>
          ) : (
            <ul>
              {recent.map((notif) => (
                <li key={notif.id}>
                  <button
                    onClick={() => markRead(notif.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAFAFA] ${
                      !notif.is_read ? "bg-[#F7F7F7]" : ""
                    }`}
                  >
                    <span className="mt-0.5 text-lg">
                      {TYPE_ICONS[notif.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold leading-snug ${
                          notif.is_read ? "text-[#1A1A1A]" : "text-[#1A1A1A]"
                        } line-clamp-2`}
                      >
                        {notif.subject}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {notif.is_read ? (
                          <MailOpen className="h-3 w-3 text-[#999999]" />
                        ) : (
                          <Mail className="h-3 w-3 text-[#1A1A1A]" />
                        )}
                        <span className="text-[10px] text-[#999999]">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                    </div>
                    {!notif.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#1A1A1A]" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          <div className="border-t border-[#E5E5E5] px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-medium text-[#1A1A1A] hover:underline"
            >
              すべての通知を見る →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
