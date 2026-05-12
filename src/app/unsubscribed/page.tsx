import Link from "next/link";

type SearchParams = Promise<{
  status?: string;
  channel?: string;
}>;

const STATUS_COPY: Record<
  string,
  { title: string; body: string; tone: "ok" | "warn" | "err" }
> = {
  ok: {
    title: "通知を停止しました",
    body: "この主催者からの通知は今後送信されません。再開はマイページの「フォロー中の主催者」から設定できます。",
    tone: "ok",
  },
  expired: {
    title: "リンクの有効期限が切れています",
    body: "お手数ですがマイページの「フォロー中の主催者」から通知設定を変更してください。",
    tone: "warn",
  },
  invalid: {
    title: "リンクが無効です",
    body: "URLが壊れているか、対象のフォローが既に解除されている可能性があります。",
    tone: "err",
  },
  error: {
    title: "通知設定の更新に失敗しました",
    body: "サーバーエラーが発生しました。マイページから手動で設定してください。",
    tone: "err",
  },
};

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status: rawStatus, channel } = await searchParams;
  const status = rawStatus && STATUS_COPY[rawStatus] ? rawStatus : "invalid";
  const copy = STATUS_COPY[status];

  const channelLabel =
    channel === "email"
      ? "メール通知"
      : channel === "line"
      ? "LINE通知"
      : null;

  const accent =
    copy.tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : copy.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <main className="min-h-dvh bg-[#FAFAFA] flex items-center justify-center px-4 py-12">
      <div
        className={`w-full max-w-md rounded-2xl border ${accent} px-6 py-8 text-center`}
      >
        <p className="text-2xl mb-3">
          {copy.tone === "ok" ? "✅" : copy.tone === "warn" ? "⚠️" : "❌"}
        </p>
        <h1 className="text-lg font-bold mb-2">{copy.title}</h1>
        {channelLabel && status === "ok" && (
          <p className="my-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-medium">
            停止チャネル: {channelLabel}
          </p>
        )}
        <p className="text-sm leading-relaxed">{copy.body}</p>

        <div className="mt-6 flex gap-2 justify-center">
          <Link
            href="/my/follows"
            className="inline-flex items-center justify-center rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#404040] transition-colors"
          >
            フォロー設定へ
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-[#E5E5E5] bg-white px-5 py-2.5 text-sm font-medium text-[#1A1A1A] hover:border-[#1A1A1A]/30 transition-colors"
          >
            ホームへ
          </Link>
        </div>
      </div>
    </main>
  );
}
