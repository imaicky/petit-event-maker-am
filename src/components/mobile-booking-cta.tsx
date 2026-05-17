"use client";

/**
 * モバイル固定下部の申し込みCTA。
 * クリック時、申込フォームへスクロール → カスタムイベントで BookingForm に
 * バリデーション付き submit を依頼する。これにより入力ミス時のエラー表示も
 * トップの「参加を申し込む」ボタンと同じ挙動になる。
 */

import { useEffect, useState } from "react";

interface MobileBookingCTAProps {
  eventTitle: string;
  price: number;
  isClosed: boolean;
  remaining: number;
}

export function MobileBookingCTA({
  eventTitle,
  price,
  isClosed,
  remaining,
}: MobileBookingCTAProps) {
  const [submitting, setSubmitting] = useState(false);

  // BookingForm から「submit中」のシグナルを受け取ってボタンを無効化する
  useEffect(() => {
    const onStart = () => setSubmitting(true);
    const onEnd = () => setSubmitting(false);
    window.addEventListener("booking-form-submit-start", onStart);
    window.addEventListener("booking-form-submit-end", onEnd);
    return () => {
      window.removeEventListener("booking-form-submit-start", onStart);
      window.removeEventListener("booking-form-submit-end", onEnd);
    };
  }, []);

  const handleClick = () => {
    const section = document.getElementById("booking-form");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // スクロール開始のすぐ後に submit イベントを投げる。BookingForm 側の
    // useEffect で listen しており、バリデーション→送信が走る。
    // 短い遅延を入れているのは、視覚的にフォームが見えてからエラーが出る方が
    // 何が起きたか分かりやすいため。
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("booking-form-request-submit"));
    }, 300);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/20 glass px-4 py-3 lg:hidden"
      style={{ boxShadow: "0 -4px 24px -4px rgba(0, 0, 0, 0.08)" }}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#1A1A1A]">
            {eventTitle}
          </p>
          <p className="text-xs font-bold text-[#1A1A1A]">
            {price === 0 ? "無料" : `¥${price.toLocaleString("ja-JP")}`}
          </p>
        </div>
        {isClosed ? (
          <span className="shrink-0 rounded-xl bg-[#999999] px-6 py-3 text-sm font-bold text-white">
            受付終了
          </span>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={submitting}
            className={`shine-on-hover shrink-0 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed ${
              remaining <= 0
                ? "bg-gradient-to-r from-[#FF8C00] to-[#E67700] shadow-lg shadow-[#FF8C00]/30 hover:from-[#E67700] hover:to-[#CC6A00] hover:shadow-xl active:scale-95"
                : "bg-gradient-to-r from-[#E8590C] to-[#D9480F] shadow-lg shadow-[#E8590C]/30 hover:from-[#D9480F] hover:to-[#C92A2A] hover:shadow-xl active:scale-95"
            }`}
          >
            {remaining <= 0 ? "キャンセル待ち" : "申し込む"}
          </button>
        )}
      </div>
    </div>
  );
}
