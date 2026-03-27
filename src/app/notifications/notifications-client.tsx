"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  MailOpen,
  CalendarCheck,
  AlertCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NotificationType =
  | "booking_confirmation"
  | "new_booking_alert"
  | "booking_reminder"
  | "booking_cancellation";

interface Notification {
  id: string;
  type: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  booking_confirmation: "申し込み確認",
  new_booking_alert: "新規申し込み",
  booking_reminder: "リマインダー",
  booking_cancellation: "キャンセル",
};

// Lucide icon per notification type
function TypeIcon({
  type,
  read,
}: {
  type: string;
  read: boolean;
}) {
  const base = read ? "text-[#999999]" : "text-[#1A1A1A]";

  const t = type as NotificationType;
  switch (t) {
    case "booking_confirmation":
      return <CalendarCheck className={`h-5 w-5 ${base}`} />;
    case "new_booking_alert":
      return <Bell className={`h-5 w-5 ${base}`} />;
    case "booking_reminder":
      return <AlertCircle className={`h-5 w-5 ${base}`} />;
    case "booking_cancellation":
      return <X className={`h-5 w-5 ${base}`} />;
    default:
      return <Bell className={`h-5 w-5 ${base}`} />;
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}時間前`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}日前`;
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

// ─── Notification item ────────────────────────────────────────────────────────

function NotificationItem({
  notif,
  expanded,
  onExpand,
}: {
  notif: Notification;
  expanded: boolean;
  onExpand: (id: string) => void;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white transition-all duration-200 ${
        notif.is_read
          ? "border-[#E5E5E5]"
          : "border-[#1A1A1A]/30 shadow-sm"
      }`}
    >
      <button
        onClick={() => onExpand(notif.id)}
        className="w-full text-left p-4 flex items-start gap-3"
        aria-expanded={expanded}
      >
        {/* Unread indicator + icon */}
        <div className="relative shrink-0">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              notif.is_read ? "bg-[#F2F2F2]" : "bg-[#F7F7F7]"
            }`}
          >
            <TypeIcon type={notif.type} read={notif.is_read} />
          </div>
          {!notif.is_read && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1A1A1A] opacity-30" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1A1A1A]" />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-xs font-semibold ${
                  notif.is_read ? "text-[#999999]" : "text-[#1A1A1A]"
                }`}
              >
                {TYPE_LABELS[notif.type] ?? notif.type}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#999999]">
              {notif.is_read ? (
                <MailOpen className="h-3 w-3" />
              ) : (
                <Bell className="h-3 w-3 text-[#1A1A1A]" />
              )}
              <span>{formatTime(notif.created_at)}</span>
            </div>
          </div>

          <p className="mt-0.5 text-sm font-semibold leading-snug text-[#1A1A1A] line-clamp-1">
            {notif.subject}
          </p>

          {!expanded && (
            <p className="mt-1 text-xs text-[#999999] line-clamp-1">
              {notif.body.split("\n")[0]}
            </p>
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#999999] transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-[#FAFAFA] p-4 border border-[#E5E5E5]">
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#1A1A1A]">
              {notif.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(json.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", {
      method: "POST",
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleExpand = (id: string) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      markRead(id);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E5E5E5] border-t-[#1A1A1A]" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#F7F7F7]">
          <Bell className="h-10 w-10 text-[#1A1A1A]" />
        </div>
        <h2
          className="mb-2 text-lg font-bold text-[#1A1A1A]"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          通知はありません
        </h2>
        <p className="text-sm text-[#999999] max-w-xs leading-relaxed">
          新しいお知らせが届くとここに表示されます。
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1A1A1A] px-1.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
          <span className="text-sm text-[#999999]">
            {notifications.length}件の通知
          </span>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            className="gap-1.5 text-xs text-[#404040] hover:bg-[#EFF6F2] hover:text-[#404040]"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            すべて既読にする
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {notifications.map((notif) => (
          <NotificationItem
            key={notif.id}
            notif={notif}
            expanded={expanded === notif.id}
            onExpand={handleExpand}
          />
        ))}
      </div>
    </div>
  );
}
