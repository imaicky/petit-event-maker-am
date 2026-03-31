import Link from "next/link";
import { headers } from "next/headers";
import {
  Calendar,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Share2,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventData {
  id: string;
  title: string;
  description: string;
  datetime: string;
  location: string;
  location_type?: string | null;
  online_url?: string | null;
  location_url?: string | null;
  capacity: number;
  price: number;
  booked_count: number;
  image_url?: string;
  is_published?: boolean;
  line_friend_url?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatetime(datetimeStr: string): string {
  try {
    return new Date(datetimeStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return datetimeStr;
  }
}

function buildGoogleCalendarUrl(event: {
  title: string;
  datetime: string;
  location: string;
  description: string;
}): string {
  const start = new Date(event.datetime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: event.location,
    details: event.description.slice(0, 200),
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

// ─── Share buttons (client component workaround with data attrs) ─────────────
// We use plain <a> tags for share links that can be rendered server-side.

function ShareButtons({ url, title }: { url: string; title: string }) {
  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(
    `${title}\n${url}`
  )}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${title}\n${url}`
  )}`;

  return (
    <div>
      <p className="mb-3 text-xs text-center text-[#999999] flex items-center justify-center gap-1.5">
        <Share2 className="h-3.5 w-3.5" />
        友だちにシェアする
      </p>
      <div className="grid grid-cols-3 gap-2">
        {/* LINE */}
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 text-xs font-medium text-[#1A1A1A] hover:bg-[#06C755]/5 hover:border-[#06C755]/30 transition-all"
          aria-label="LINEでシェア"
        >
          <span className="text-xl">💬</span>
          <span>LINE</span>
        </a>

        {/* Twitter/X */}
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 text-xs font-medium text-[#1A1A1A] hover:bg-[#1DA1F2]/5 hover:border-[#1DA1F2]/30 transition-all"
          aria-label="Twitterでシェア"
        >
          <span className="text-xl">🐦</span>
          <span>Twitter</span>
        </a>

        {/* Copy link */}
        <CopyLinkButton url={url} />
      </div>
    </div>
  );
}

// ─── Copy link — needs client JS, use a form trick with a data attr ──────────
// Since this is a server component we output a button with data-copy-url and
// handle it with a simple inline onclick (acceptable in Next.js server components).

function CopyLinkButton({ url }: { url: string }) {
  return (
    <button
      onClick={undefined}
      data-copy-url={url}
      // eslint-disable-next-line react/no-unknown-property
      suppressHydrationWarning
      className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 text-xs font-medium text-[#1A1A1A] hover:bg-[#F7F7F7] hover:border-[#1A1A1A]/30 transition-all cursor-pointer"
      aria-label="リンクをコピー"
    >
      <Copy className="h-5 w-5 text-[#1A1A1A]" />
      <span>コピー</span>
    </button>
  );
}

// ─── Suggested event card ─────────────────────────────────────────────────────

function SuggestedEventCard({ event }: { event: EventData }) {
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className="flex gap-3 rounded-xl border border-[#E5E5E5] bg-white p-3 hover:border-[#1A1A1A]/30 hover:shadow-sm transition-all">
        {/* Thumbnail */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-[#F2F2F2] to-[#E0E0E0]">
          {event.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              🎉
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A1A1A] line-clamp-2 group-hover:text-[#1A1A1A] transition-colors leading-snug">
            {event.title}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-[#999999]">
            <Calendar className="h-3 w-3 text-[#1A1A1A] shrink-0" />
            <span>
              {new Date(event.datetime).toLocaleDateString("ja-JP", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-bold text-[#1A1A1A]">
            {event.price === 0
              ? "無料"
              : `¥${event.price.toLocaleString("ja-JP")}`}
          </p>
        </div>

        <ArrowRight className="h-4 w-4 text-[#999999] group-hover:text-[#1A1A1A] transition-colors shrink-0 self-center" />
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ThanksPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ThanksPage({
  params,
  searchParams,
}: ThanksPageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const guestName = typeof sp?.name === "string" ? sp.name : "";
  const guestEmail = typeof sp?.email === "string" ? sp.email : "";

  // Fetch event from API
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3007";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let event: EventData | undefined;
  try {
    const res = await fetch(`${baseUrl}/api/events/${id}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      event = json.event;
    }
  } catch {
    /* ignore */
  }

  // Fetch a few other published events as suggestions (exclude this one)
  let suggestedEvents: EventData[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/events`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const all: EventData[] = json.events ?? [];
      suggestedEvents = all
        .filter(
          (e) =>
            e.id !== id &&
            e.is_published &&
            new Date(e.datetime) > new Date()
        )
        .slice(0, 3);
    }
  } catch {
    /* ignore */
  }

  const calendarUrl = event
    ? buildGoogleCalendarUrl({
        title: event.title,
        datetime: event.datetime,
        location: event.location,
        description: event.description,
      })
    : null;

  const eventPageUrl = `${baseUrl}/events/${id}`;

  return (
    <main className="min-h-dvh bg-[#FAFAFA] px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        {/* ── Success animation ─────────────────────────────────────────── */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-5">
            {/* Outer ring ping */}
            <span className="absolute inset-0 animate-ping rounded-full bg-[#404040]/20" />
            {/* Outer decorative ring */}
            <span className="absolute -inset-3 rounded-full bg-[#404040]/10 animate-pulse" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#404040] shadow-lg">
              <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <h1
            className="text-2xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            お申し込み完了！
          </h1>
          {guestName && (
            <p className="mt-2 text-base text-[#1A1A1A]/70">
              {guestName}さん、ありがとうございます🎉
            </p>
          )}
          {guestEmail && (
            <p className="mt-1 text-sm text-[#999999]">
              確認メールを{" "}
              <span className="font-medium text-[#1A1A1A]">{guestEmail}</span>{" "}
              へお送りしました
            </p>
          )}
        </div>

        {/* ── Event summary card ────────────────────────────────────────── */}
        {event && (
          <div className="mb-5 overflow-hidden rounded-2xl bg-white border border-[#E5E5E5] shadow-sm">
            {/* Event image */}
            {event.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.image_url}
                alt={event.title}
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="flex h-24 items-center justify-center bg-gradient-to-r from-[#F2F2F2] to-[#E0E0E0]">
                <span className="text-5xl">🎉</span>
              </div>
            )}

            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#1A1A1A] mb-1">
                申し込み内容
              </p>
              <h2 className="text-base font-bold leading-snug text-[#1A1A1A] mb-4">
                {event.title}
              </h2>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7F7F7]">
                    <Calendar className="h-3.5 w-3.5 text-[#1A1A1A]" />
                  </div>
                  <span className="text-[#1A1A1A]/80">
                    {formatDatetime(event.datetime)}
                  </span>
                </div>
                {(event.location_type === "physical" || event.location_type === "hybrid" || !event.location_type) && event.location && (
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7F7F7]">
                      <MapPin className="h-3.5 w-3.5 text-[#1A1A1A]" />
                    </div>
                    <div>
                      <span className="text-[#1A1A1A]/80">{event.location}</span>
                      {event.location_url && (
                        <a
                          href={event.location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block text-xs text-blue-600 underline hover:text-blue-800"
                        >
                          地図を開く
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {(event.location_type === "online" || event.location_type === "hybrid") && (
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7F7F7]">
                      <Video className="h-3.5 w-3.5 text-[#1A1A1A]" />
                    </div>
                    <div>
                      <span className="text-[#1A1A1A]/80">オンライン</span>
                      {event.online_url ? (
                        <a
                          href={event.online_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block text-xs text-blue-600 underline hover:text-blue-800 break-all"
                        >
                          参加リンクを開く
                        </a>
                      ) : (
                        <p className="mt-0.5 text-xs text-[#999999]">URLは後日お知らせします</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7F7F7]">
                    <span className="text-sm">💴</span>
                  </div>
                  <span className="font-bold text-[#1A1A1A]">
                    {event.price === 0
                      ? "無料"
                      : `¥${event.price.toLocaleString("ja-JP")}`}
                  </span>
                </div>
                {guestName && (
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F7F7F7]">
                      <span className="text-sm">👤</span>
                    </div>
                    <span className="text-[#1A1A1A]/80">
                      お名前：<span className="font-medium">{guestName}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="space-y-3 mb-6">
          {calendarUrl && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#1A1A1A] bg-white text-sm font-bold text-[#1A1A1A] transition-colors hover:bg-[#F7F7F7]"
            >
              <Calendar className="h-4 w-4" />
              Googleカレンダーに追加
            </a>
          )}

          <Link href={`/events/${id}`} className="block">
            <Button
              variant="outline"
              className="h-11 w-full rounded-xl border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#F2F2F2] gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              イベントページを見る
            </Button>
          </Link>
        </div>

        {/* ── LINE friend add ─────────────────────────────────────────── */}
        {event?.line_friend_url && (
          <div className="mb-6 rounded-2xl border border-[#06C755]/30 bg-[#06C755]/5 p-5 text-center">
            <div className="mb-2 flex justify-center">
              <span className="text-3xl">💬</span>
            </div>
            <p className="text-sm font-bold text-[#1A1A1A] mb-1">
              主催者のLINE公式アカウント
            </p>
            <p className="text-xs text-[#999999] mb-4">
              友だち追加すると、イベントの最新情報やお知らせが届きます
            </p>
            <a
              href={event.line_friend_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#06C755] px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#05b54c] active:scale-95"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              友だち追加
            </a>
          </div>
        )}

        {/* ── Review prompt ────────────────────────────────────────────── */}
        <div className="mb-4 rounded-2xl border border-[#E5E5E5] bg-white p-4 text-center">
          <p className="text-xs text-[#999999] mb-2">イベント参加後にぜひ感想をお聞かせください</p>
          <Link
            href={`/events/${id}#reviews`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F7F7] px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#E5E5E5] transition-colors"
          >
            <span>⭐</span>
            レビューを書く
          </Link>
        </div>

        {/* ── Social share ─────────────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-[#E5E5E5] bg-white p-4">
          <ShareButtons url={eventPageUrl} title={event?.title ?? "イベント"} />
        </div>

        {/* ── Suggested events ─────────────────────────────────────────── */}
        {suggestedEvents.length > 0 && (
          <section className="mb-8">
            <h2
              className="mb-3 text-base font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              次のイベントもチェック ✨
            </h2>
            <div className="space-y-2.5">
              {suggestedEvents.map((ev) => (
                <SuggestedEventCard key={ev.id} event={ev} />
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[#E5E5E5] gap-1 hover:border-[#1A1A1A]/30"
                >
                  もっとイベントを見る
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </section>
        )}

        <p className="text-center text-xs text-[#999999] leading-relaxed">
          ご不明な点はイベント主催者までお問い合わせください。
        </p>
      </div>
    </main>
  );
}
