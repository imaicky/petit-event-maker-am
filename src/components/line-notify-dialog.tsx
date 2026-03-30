"use client";

import { useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
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
};

export function LineNotifyDialog({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  onSuccess,
}: LineNotifyDialogProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/line-notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
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

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset state when closing
      setTimeout(() => {
        setMessage("");
        setSent(false);
        setError("");
      }, 200);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>LINE通知を送信</DialogTitle>
          <DialogDescription>
            LINE公式アカウントのフォロワー全員に通知します
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
        ) : (
          <>
            <div className="space-y-3">
              <div className="rounded-lg bg-[#F7F7F7] p-3">
                <p className="text-xs text-[#999999] mb-1">送信イベント</p>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {eventTitle}
                </p>
              </div>

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
                メッセージの後にイベントカード（画像・詳細・予約ボタン付き）が自動で送信されます。
              </p>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
            </div>

            <DialogFooter>
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
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
