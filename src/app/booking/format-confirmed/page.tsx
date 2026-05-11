import Link from "next/link";

type SearchParams = Promise<{
  status?: string;
  format?: string;
}>;

const STATUS_COPY: Record<
  string,
  { title: string; body: string; tone: "ok" | "warn" | "err" }
> = {
  ok: {
    title: "ご回答ありがとうございました",
    body: "あなたの参加形式を更新しました。当日お会いできるのを楽しみにしています。",
    tone: "ok",
  },
  expired: {
    title: "リンクの有効期限が切れています",
    body: "お手数ですが主催者までご連絡ください。手動で変更いたします。",
    tone: "warn",
  },
  invalid: {
    title: "リンクが無効です",
    body: "URLが壊れているか、すでに削除された予約の可能性があります。主催者にお問い合わせください。",
    tone: "err",
  },
  cancelled: {
    title: "この予約はキャンセル済みです",
    body: "形式の更新は行われませんでした。再度参加されたい場合はイベントページから再申込してください。",
    tone: "warn",
  },
  error: {
    title: "更新に失敗しました",
    body: "サーバーエラーが発生しました。時間を置いて再度お試しください。",
    tone: "err",
  },
};

export default async function FormatConfirmedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status: rawStatus, format } = await searchParams;
  const status = rawStatus && STATUS_COPY[rawStatus] ? rawStatus : "invalid";
  const copy = STATUS_COPY[status];

  const formatLabel =
    format === "physical"
      ? "📍 リアル参加（会場）"
      : format === "online"
      ? "🎥 オンライン参加"
      : null;

  const accent =
    copy.tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : copy.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <main className="min-h-dvh bg-[#FAFAFA] flex items-center justify-center px-4 py-12">
      <div className={`w-full max-w-md rounded-2xl border ${accent} px-6 py-8 text-center`}>
        <p className="text-2xl mb-3">
          {copy.tone === "ok" ? "✅" : copy.tone === "warn" ? "⚠️" : "❌"}
        </p>
        <h1 className="text-lg font-bold mb-2">{copy.title}</h1>
        {formatLabel && status === "ok" && (
          <p className="my-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-medium">
            {formatLabel}
          </p>
        )}
        <p className="text-sm leading-relaxed">{copy.body}</p>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#404040] transition-colors"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
