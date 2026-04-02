"use client";

import { useState } from "react";
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  Users,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EMAIL_TEMPLATES,
  fillTemplate,
  type TemplateId,
} from "@/lib/email-templates";

interface MessageDialogProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  recipientCount: number;
  open: boolean;
  onClose: () => void;
  /** "event" (default) or "menu" — determines which API endpoint to call */
  targetType?: "event" | "menu";
}

export function MessageDialog({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  recipientCount,
  open,
  onClose,
  targetType = "event",
}: MessageDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(
    null
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const basePath = targetType === "menu" ? "menus" : "events";
  const eventUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${basePath}/${eventId}`
      : `/${basePath}/${eventId}`;

  const templateVars = {
    eventTitle,
    eventDate: eventDate || (targetType === "menu" ? "（メニューのため日時なし）" : "未定"),
    eventLocation: eventLocation || (targetType === "menu" ? "（メニューのため場所なし）" : "未定"),
    eventUrl,
  };

  function handleSelectTemplate(id: TemplateId) {
    setSelectedTemplate(id);
    setError(null);
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === id);
    if (tpl) {
      setSubject(fillTemplate(tpl.defaultSubject, templateVars));
      setMessage(fillTemplate(tpl.defaultBody, templateVars));
    }
  }

  async function handleSend() {
    if (!subject.trim() || !message.trim()) {
      setError("件名と本文を入力してください");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/${basePath}/${eventId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました");
        return;
      }

      setSentCount(data.sent);
      setSent(true);
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setSelectedTemplate(null);
    setSubject("");
    setMessage("");
    setSending(false);
    setSent(false);
    setSentCount(0);
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl border border-[#E5E5E5] shadow-xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#F2F2F2] px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#1A1A1A]" />
            <h2
              className="text-base font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              メッセージ送信
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F2F2F2] transition-colors"
            aria-label="閉じる"
          >
            <X className="h-4 w-4 text-[#999999]" />
          </button>
        </div>

        <div className="p-5">
          {sent ? (
            /* Success state */
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <p
                className="text-lg font-bold text-[#1A1A1A] mb-1"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                送信完了
              </p>
              <p className="text-sm text-[#999999]">
                {sentCount}名にメッセージを送信しました
              </p>
              <Button
                type="button"
                className="mt-6 rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111]"
                onClick={handleClose}
              >
                閉じる
              </Button>
            </div>
          ) : !selectedTemplate ? (
            /* Template selection */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-[#999999]">
                <Users className="h-4 w-4" />
                <span>
                  <span className="font-bold text-[#1A1A1A]">
                    {recipientCount}名
                  </span>
                  の参加者に送信
                </span>
              </div>

              <p className="text-sm font-medium text-[#1A1A1A]">
                テンプレートを選択
              </p>

              <div className="grid grid-cols-2 gap-2">
                {EMAIL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-[#E5E5E5] bg-white p-4 hover:border-[#1A1A1A]/30 hover:bg-[#FAFAFA] transition-all text-center"
                  >
                    <span className="text-2xl">{tpl.emoji}</span>
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      {tpl.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Compose form */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-[#999999]">
                <Users className="h-4 w-4" />
                <span>
                  <span className="font-bold text-[#1A1A1A]">
                    {recipientCount}名
                  </span>
                  の参加者に送信
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
              >
                ← テンプレートを変更
              </button>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">
                  件名
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="メッセージの件名"
                  className="h-10 rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">
                  本文
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="メッセージ本文を入力..."
                  rows={8}
                  className="rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA] resize-none"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-full border-[#E5E5E5]"
                  onClick={handleClose}
                  disabled={sending}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  className="flex-1 rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-2"
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !message.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      送信する
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
