"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Shown on the thanks page when a Stripe payment was likely just completed
 * (we have a session_id but the booking row still says payment_status='pending').
 * Stripe webhook usually fires within a couple of seconds — auto-refresh the
 * page after a short delay so the user sees the participant info without
 * having to manually reload.
 */
export function PaymentPendingNotice({ method }: { method: "stripe" | "bank" }) {
  const [secondsLeft, setSecondsLeft] = useState(8);

  useEffect(() => {
    if (method !== "stripe") return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.location.reload();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [method]);

  if (method === "bank") {
    return (
      <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-bold text-emerald-900">入金確認中</p>
        <p className="mt-1 text-xs text-emerald-800">
          主催者がご入金を確認次第、参加情報をメールでお送りします
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-bold text-blue-900">
        <Loader2 className="h-4 w-4 animate-spin" />
        決済処理を確認しています…
      </div>
      <p className="mt-1 text-xs text-blue-800">
        通常数秒で完了します。{secondsLeft > 0 ? `${secondsLeft}秒後に自動更新します` : "更新中..."}
      </p>
    </div>
  );
}
