"use client";

import { useState } from "react";
import { Lock, Copy, Check, ExternalLink } from "lucide-react";

/**
 * 限定公開イベント用の招待リンク発行パネル。
 * 主催者だけに表示され、パスコード付きURLをワンクリックでコピーできる。
 *
 * URL構造: /e/{short_code}?pass={passcode} or /events/{id}?pass={passcode}
 * ?pass= がついていれば PasscodeAutoUnlock がCookieに保存して即時解錠する。
 */
export function InviteLinkPanel({
  eventId,
  shortCode,
  passcode,
}: {
  eventId: string;
  shortCode: string | null;
  passcode: string;
}) {
  const [copied, setCopied] = useState(false);
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://petit-event-maker-am.vercel.app";
  const path = shortCode ? `/e/${shortCode}` : `/events/${eventId}`;
  const inviteUrl = `${origin}${path}?pass=${encodeURIComponent(passcode)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing visible
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Lock className="h-4 w-4 text-amber-700" />
        <h2 className="text-sm font-bold text-amber-900">
          招待リンク（限定公開イベント）
        </h2>
        <span className="ml-auto rounded-full bg-amber-200/60 px-2 py-0.5 text-[10px] font-medium text-amber-800">
          管理者専用
        </span>
      </div>
      <p className="mb-2 text-xs text-amber-800 leading-relaxed">
        このURLを共有すると、パスコード入力なしで直接イベント詳細に
        アクセスできます（一度開けば30日間有効）。
      </p>
      <div className="mb-2 rounded-lg bg-white/80 p-2 ring-1 ring-amber-200">
        <p className="text-[11px] tabular-nums text-[#1A1A1A] break-all">
          {inviteUrl}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              コピーしました
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              URLをコピー
            </>
          )}
        </button>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          動作確認
        </a>
      </div>
    </div>
  );
}
