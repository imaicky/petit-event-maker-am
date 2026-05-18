/**
 * 主催者LINE公式アカウントの友だち追加カード
 *
 * 申込フォームの直前に置き、申込前に追加すると得られる体験
 * （自動リマインド / 変更通知 / オンライン情報の受信）を明示する。
 * Chrome→LINEアプリのdeep-link失敗ケースを救済するため QR コードも併記。
 */

interface Props {
  lineFriendUrl: string;
  /** 表示バリエーション。"prebooking"=申込前の促し / "compact"=説明少なめ */
  variant?: "prebooking" | "compact";
  className?: string;
}

const LineIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
);

export function LineFriendAddCard({
  lineFriendUrl,
  variant = "prebooking",
  className = "",
}: Props) {
  const isPrebooking = variant === "prebooking";

  return (
    <div
      className={`rounded-2xl border-2 border-[#06C755]/40 bg-[#06C755]/5 p-4 sm:p-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-[#06C755]">
          <LineIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-bold text-[#1A1A1A]">
            {isPrebooking
              ? "申込前にLINE友だち追加がおすすめ"
              : "主催者のLINE公式アカウント"}
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs text-[#666666]">
            {isPrebooking
              ? "通知を取り逃がさないために、先にこちらをタップ"
              : "友だち追加でイベント情報・リマインドをお届け"}
          </p>
        </div>
      </div>

      {/* Benefits */}
      {isPrebooking && (
        <ul className="mb-4 space-y-1.5 text-xs sm:text-sm text-[#1A1A1A]">
          <li className="flex items-start gap-2">
            <span className="text-[#06C755] font-bold shrink-0">✓</span>
            <span>開催前のリマインドをLINEで自動受信</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#06C755] font-bold shrink-0">✓</span>
            <span>オンライン参加URLや会場変更などの最新情報がすぐ届く</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#06C755] font-bold shrink-0">✓</span>
            <span>主催者から1:1のメッセージで質問にも対応</span>
          </li>
        </ul>
      )}

      {/* Add methods: button + QR */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex flex-col gap-2">
          <a
            href={lineFriendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] text-sm font-bold text-white shadow-sm transition-all hover:bg-[#05b54c] active:scale-95"
          >
            <LineIcon className="h-4 w-4" />
            LINEアプリで友だち追加
          </a>
          <p className="text-[11px] leading-relaxed text-[#666666]">
            ボタンで追加できない場合は、スマホのLINEアプリで右のQRコードを読み込んでください
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/line/qr?u=${encodeURIComponent(lineFriendUrl)}`}
            alt="LINE友だち追加QRコード"
            width={120}
            height={120}
            className="rounded-xl border border-[#E5E5E5] bg-white p-1.5"
            loading="lazy"
          />
          <p className="text-[10px] text-[#999999]">QRで追加</p>
        </div>
      </div>
    </div>
  );
}
