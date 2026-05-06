"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

export function ResendConfirmation({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "送信に失敗しました");
      } else {
        setMessage(json.message ?? "確認メールを再送しました");
        setEmail("");
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#1A1A1A] hover:underline transition-colors"
      >
        <Mail className="h-3.5 w-3.5" />
        申し込み済みの方：確認メールを再送
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
      <p className="text-sm font-bold text-[#1A1A1A] mb-1">確認メールの再送</p>
      <p className="text-xs text-[#999999] mb-3">
        申し込み時に登録したメールアドレスに、参加情報（Zoom IDなど）を含む確認メールを再送します。
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="例：example@email.com"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm focus:border-[#1A1A1A] focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !email}
            className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-sm font-bold text-white hover:bg-[#111111] disabled:opacity-50 transition-colors"
          >
            {loading ? "送信中…" : "メールを再送"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setMessage(null);
              setError(null);
            }}
            className="rounded-lg border border-[#E5E5E5] px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#F7F7F7] transition-colors"
          >
            閉じる
          </button>
        </div>
      </form>
      {message && (
        <p className="mt-3 rounded-lg bg-[#F7F7F7] px-3 py-2 text-xs text-[#1A1A1A]">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
