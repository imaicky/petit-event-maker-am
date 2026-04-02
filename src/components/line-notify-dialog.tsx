"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2, Clock, X, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type LineNotifyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  onSuccess: () => void;
  currentSchedule?: {
    scheduled_at: string;
    message: string | null;
  } | null;
  /** Set to true to show segment options (for events that were already notified) */
  allowSegment?: boolean;
  /** Target type — "event" (default) or "menu" */
  targetType?: "event" | "menu";
};

type Mode = "immediate" | "schedule";
type Segment = "all" | "attendees";

function formatScheduleDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LineNotifyDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onSuccess,
  currentSchedule,
  allowSegment = false,
  targetType = "event",
}: LineNotifyDialogProps) {
  const isMenu = targetType === "menu";
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [segment, setSegment] = useState<Segment>("all");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const apiPath = isMenu
        ? `/api/menus/${eventId}/line-notify`
        : `/api/events/${eventId}/line-notify`;
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, segment: isMenu && segment === "attendees" ? "applicants" : segment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "送信に失敗しました");
        return;
      }
      setSent(true);
      onSuccess();
    } catch {
      setError("送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledAt) {
      setError("送信日時を選択してください");
      return;
    }

    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/line-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: new Date(scheduledAt).toISOString(),
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "予約に失敗しました");
        return;
      }
      setScheduled(true);
      onSuccess();
    } catch {
      setError("予約に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleCancelSchedule = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/line-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "キャンセルに失敗しました");
        return;
      }
      setCancelled(true);
      onSuccess();
    } catch {
      setError("キャンセルに失敗しました");
    } finally {
      setSending(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTimeout(() => {
        setMessage("");
        setSent(false);
        setScheduled(false);
        setCancelled(false);
        setError("");
        setMode("immediate");
        setScheduledAt("");
        setSegment("all");
      }, 200);
    }
    onOpenChange(nextOpen);
  };

  // Get minimum datetime (now + 10 minutes, rounded to nearest 5 min)
  const getMinDatetime = () => {
    const d = new Date(Date.now() + 10 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>LINE通知を送信</DialogTitle>
          <DialogDescription>
            {isMenu
              ? "LINE公式アカウントのフォロワーにメニューを案内します"
              : "LINE公式アカウントのフォロワー全員に通知します"}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium text-[#1A1A1A]">送信しました</p>
            <p className="text-xs text-[#999999]">
              LINEアプリで確認してください
            </p>
          </div>
        ) : scheduled ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <Clock className="h-12 w-12 text-[#06C755]" />
            <p className="text-sm font-medium text-[#1A1A1A]">予約しました</p>
            <p className="text-xs text-[#999999]">
              {formatScheduleDate(scheduledAt)}に自動送信されます
            </p>
          </div>
        ) : cancelled ? (
          <div className="flex flex-col items-center py-6 gap-3">
            <CheckCircle2 className="h-12 w-12 text-[#999999]" />
            <p className="text-sm font-medium text-[#1A1A1A]">予約をキャンセルしました</p>
          </div>
        ) : currentSchedule ? (
          /* Show current schedule with change/cancel options */
          <div className="space-y-4">
            {new Date(currentSchedule.scheduled_at) <= new Date() ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">
                    予約時刻を過ぎています
                  </p>
                </div>
                <p className="text-sm text-amber-700">
                  {formatScheduleDate(currentSchedule.scheduled_at)}の予約が未送信です。「今すぐ送信」を押してください。
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-[#06C755]/5 border border-[#06C755]/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-[#06C755]" />
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    予約送信が設定されています
                  </p>
                </div>
                <p className="text-sm text-[#666666]">
                  {formatScheduleDate(currentSchedule.scheduled_at)}に送信予定
                </p>
              </div>
            )}
            {currentSchedule.message && (
              <p className="text-xs text-[#999999] line-clamp-2">
                メッセージ: {currentSchedule.message}
              </p>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleCancelSchedule}
                disabled={sending}
                className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                予約をキャンセル
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending}
                className="gap-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                今すぐ送信
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="rounded-lg bg-[#F7F7F7] p-3">
                <p className="text-xs text-[#999999] mb-1">{isMenu ? "送信メニュー" : "送信イベント"}</p>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {eventTitle}
                </p>
              </div>

              {/* Mode toggle (events only — menus don't support scheduled send) */}
              {!isMenu && (
                <div className="flex gap-1 rounded-xl bg-[#F2F2F2] p-1">
                  <button
                    type="button"
                    onClick={() => setMode("immediate")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      mode === "immediate"
                        ? "bg-white text-[#1A1A1A] shadow-sm"
                        : "text-[#999999] hover:text-[#1A1A1A]"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    今すぐ送信
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("schedule")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      mode === "schedule"
                        ? "bg-white text-[#1A1A1A] shadow-sm"
                        : "text-[#999999] hover:text-[#1A1A1A]"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    予約送信
                  </button>
                </div>
              )}

              {/* Segment selector */}
              {(allowSegment || mode === "immediate") && (
                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-1.5">
                    送信先
                  </label>
                  <div className="flex gap-1 rounded-xl bg-[#F7F7F7] p-1">
                    <button
                      type="button"
                      onClick={() => setSegment("all")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        segment === "all"
                          ? "bg-white text-[#1A1A1A] shadow-sm"
                          : "text-[#999999] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      全員
                    </button>
                    <button
                      type="button"
                      onClick={() => setSegment("attendees")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        segment === "attendees"
                          ? "bg-white text-[#1A1A1A] shadow-sm"
                          : "text-[#999999] hover:text-[#1A1A1A]"
                      }`}
                    >
                      <Tag className="h-3 w-3" />
                      {isMenu ? "申込者のみ" : "参加者のみ"}
                    </button>
                  </div>
                </div>
              )}

              {/* Schedule datetime picker */}
              {mode === "schedule" && (
                <div>
                  <label
                    htmlFor="schedule-datetime"
                    className="block text-xs font-medium text-[#666666] mb-1.5"
                  >
                    送信日時
                  </label>
                  <input
                    id="schedule-datetime"
                    type="datetime-local"
                    min={getMinDatetime()}
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="line-message"
                  className="block text-xs font-medium text-[#666666] mb-1.5"
                >
                  メッセージ（任意）
                </label>
                <textarea
                  id="line-message"
                  className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm placeholder:text-[#CCCCCC] focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] resize-none"
                  rows={3}
                  placeholder="カードの前に表示されるテキストメッセージ（省略可）"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-[#CCCCCC] text-right">
                  {message.length}/500
                </p>
              </div>

              <p className="text-xs text-[#999999] leading-relaxed">
                {isMenu
                  ? "メッセージの後にメニューカード（画像・詳細・申込ボタン付き）が自動で送信されます。"
                  : "メッセージの後にイベントカード（画像・詳細・予約ボタン付き）が自動で送信されます。"}
              </p>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
            </div>

            <DialogFooter>
              {mode === "immediate" ? (
                <Button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full sm:w-auto bg-[#06C755] hover:bg-[#05b34c] text-white gap-2"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {sending ? "送信中..." : "LINEで送信"}
                </Button>
              ) : (
                <Button
                  onClick={handleSchedule}
                  disabled={sending || !scheduledAt}
                  className="w-full sm:w-auto bg-[#06C755] hover:bg-[#05b34c] text-white gap-2"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  {sending ? "設定中..." : "予約を設定"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
