"use client";

import { useState } from "react";
import { QrCode, Download, X } from "lucide-react";

/**
 * QRコード表示ボタン。クリックで小ダイアログを開き、
 * /api/events/[id]/qr の画像を表示 + ダウンロードリンクを提供。
 *
 * 印刷物・展示・名刺・チラシ等への展開用。
 */
export function QRCodeButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const qrSrc = `/api/events/${eventId}/qr?size=512`;
  const downloadSrc = `/api/events/${eventId}/qr?size=1024&download=1`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:border-[#1A1A1A]/30 hover:bg-[#F7F7F7] transition-colors"
      >
        <QrCode className="h-4 w-4" />
        QRコード
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A]"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="mb-3 text-base font-bold text-[#1A1A1A]">
              イベント QRコード
            </h2>

            <div className="overflow-hidden rounded-xl bg-white ring-1 ring-[#E5E5E5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="イベント詳細ページへのQRコード"
                className="block h-auto w-full"
              />
            </div>

            <p className="mt-3 text-xs text-[#999999] leading-relaxed">
              印刷物・名刺・チラシ・SNS投稿に貼り付けて使えます。
              スマートフォンのカメラで読み取るとイベント詳細ページが開きます。
            </p>

            <a
              href={downloadSrc}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#404040]"
            >
              <Download className="h-4 w-4" />
              高解像度(1024px)でダウンロード
            </a>
          </div>
        </div>
      )}
    </>
  );
}
