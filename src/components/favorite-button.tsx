"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  initialFavorited: boolean;
  isAuthed: boolean;
  variant?: "icon" | "button";
  /** Total number of favorites for this event. Displayed inline when > 0. */
  count?: number;
};

export function FavoriteButton({
  eventId,
  initialFavorited,
  isAuthed,
  variant = "button",
  count = 0,
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);
  // ローカルでカウントを動かす（楽観UI）
  const [localCount, setLocalCount] = useState(count);
  const router = useRouter();

  async function toggle() {
    if (!isAuthed) {
      // 未ログインはトップへ誘導
      router.push(`/?next=/events/${eventId}`);
      return;
    }
    setBusy(true);
    const next = !favorited;
    setFavorited(next); // optimistic
    setLocalCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await fetch(`/api/events/${eventId}/favorite`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setFavorited(!next); // rollback
        setLocalCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    } catch {
      setFavorited(!next);
      setLocalCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={favorited ? "お気に入り解除" : "お気に入りに追加"}
        className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
          favorited
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "border-[#E5E5E5] bg-white text-[#999999] hover:border-rose-200 hover:text-rose-500"
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart
            className={`h-4 w-4 ${favorited ? "fill-rose-500" : ""}`}
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        favorited
          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "border-[#E5E5E5] bg-white text-[#1A1A1A] hover:border-rose-200 hover:bg-rose-50"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${favorited ? "fill-rose-500" : ""}`} />
      )}
      {favorited ? "お気に入り済み" : "お気に入り"}
      {localCount > 0 && (
        <span className="ml-1 text-xs tabular-nums text-[#999999]">
          {localCount}
        </span>
      )}
    </button>
  );
}
