"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PasscodeGateProps {
  eventId: string;
  eventTitle: string;
  imageUrl?: string;
  category?: string;
}

export function PasscodeGate({
  eventId,
  eventTitle,
  imageUrl,
  category,
}: PasscodeGateProps) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError("合言葉を入力してください");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/events/${eventId}/verify-passcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "合言葉の確認に失敗しました");
        setIsSubmitting(false);
        return;
      }

      // Cookie set by server — re-render to show full details
      router.refresh();
    } catch {
      setError("ネットワークエラーが発生しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAFAFA]" style={{ fontFamily: "var(--font-zen-maru)" }}>
      {/* Hero image */}
      <div className="relative w-full overflow-hidden" style={{ maxHeight: "480px", minHeight: "240px" }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={eventTitle}
            className="h-[320px] w-full object-cover sm:h-[420px] md:h-[480px]"
          />
        ) : (
          <div className="flex h-[320px] w-full items-center justify-center bg-gradient-to-br from-[#F2F2F2] via-[#EDEDED] to-[#E0E0E0] sm:h-[420px]">
            <span className="animate-float text-8xl opacity-60">🎉</span>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 via-50% via-black/5 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />

        {/* Category badge */}
        {category && (
          <div className="absolute left-6 top-6 sm:left-8 sm:top-8 animate-fade-in-up delay-100">
            <span className="glass-dark inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/90 shadow-lg">
              {category}
            </span>
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="animate-fade-in-up delay-300 text-2xl font-bold leading-snug text-white drop-shadow-md sm:text-3xl md:text-4xl">
              {eventTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Gate content */}
      <div className="mx-auto w-full max-w-md px-4 py-12">
        {/* Limited badge */}
        <div className="mb-8 flex flex-col items-center text-center animate-fade-in-up delay-100">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A1A1A]">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">限定公開イベント</h2>
          <p className="mt-2 text-sm text-[#999999]">
            このイベントは限定公開です。<br />
            主催者から共有された合言葉を入力して詳細をご覧ください。
          </p>
        </div>

        {/* Passcode form */}
        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up delay-200">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
            <Input
              type="text"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="合言葉を入力"
              autoFocus
              className="h-12 rounded-xl border-[#E5E5E5] bg-white pl-10 text-base transition-colors focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 px-4 py-3">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#DC2626] text-[8px] font-bold text-[#DC2626]">
                !
              </span>
              <p className="text-sm text-[#DC2626]">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl bg-[#1A1A1A] text-base font-bold text-white transition-colors hover:bg-[#111111] disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>確認中...</span>
              </span>
            ) : (
              "詳細を見る"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

/**
 * Client component that auto-unlocks when ?pass=xxx is in the URL.
 * Calls verify-passcode API to set the cookie, then refreshes.
 */
export function PasscodeAutoUnlock({
  eventId,
  passcode,
}: {
  eventId: string;
  passcode: string;
}) {
  const router = useRouter();

  // Run once on mount
  useState(() => {
    fetch(`/api/events/${eventId}/verify-passcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    })
      .then((res) => {
        if (res.ok) {
          // Cookie is now set — remove ?pass from URL cleanly
          const url = new URL(window.location.href);
          url.searchParams.delete("pass");
          router.replace(url.pathname + url.search);
        }
      })
      .catch(() => {
        // Silently fail — user can still use the form
      });
  });

  return null;
}
