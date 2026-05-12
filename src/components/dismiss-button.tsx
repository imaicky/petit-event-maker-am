"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

/**
 * 「興味なし」ボタン。フィードのおすすめカード右上に重ねる用。
 * 押すと該当イベントを以降のおすすめから除外する。
 * カード本体への遷移と干渉しないよう stopPropagation する。
 */
export function DismissButton({ eventId }: { eventId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy || done) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/dismiss`, {
        method: "POST",
      });
      if (res.ok) setDone(true);
    } catch {
      // silently fail
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center rounded-2xl bg-white/85 backdrop-blur-sm">
        <p className="text-xs font-medium text-[#666666]">
          ✓ おすすめから除外しました
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      disabled={busy}
      title="興味なし（このイベントを今後おすすめしない）"
      aria-label="興味なし"
      className="absolute top-3 left-3 z-[3] flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-[#999999] shadow-sm ring-1 ring-[#E5E5E5] backdrop-blur-sm transition-colors hover:bg-white hover:text-[#1A1A1A] disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
    </button>
  );
}
