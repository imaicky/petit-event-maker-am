import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/event-card";
import { createClient } from "@/lib/supabase/server";
import type { EventWithBookingCount } from "@/types/database";
import { CATEGORIES } from "@/lib/templates";
import { Footer } from "@/components/footer";
import { LandingHeader } from "@/components/landing-header";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  フラワー: "🌸",
  ハンドメイド: "💎",
  カメラ: "📷",
  ネイル: "💅",
  占い: "🔮",
  ヨガ: "🧘",
  その他: "✨",
};

const CATEGORY_COLORS: Record<string, string> = {
  フラワー: "from-gray-100 to-gray-50",
  ハンドメイド: "from-neutral-100 to-neutral-50",
  カメラ: "from-slate-100 to-slate-50",
  ネイル: "from-zinc-100 to-zinc-50",
  占い: "from-stone-100 to-stone-50",
  ヨガ: "from-gray-100 to-neutral-50",
  その他: "from-zinc-100 to-gray-50",
};

const TESTIMONIALS = [
  {
    id: 1,
    name: "田中 さくら",
    role: "フラワーアレンジメント講師",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    comment:
      "今まではLINEで日程調整していたのに、これを使ったら参加者から「申し込みが簡単すぎる！」と大絶賛。イベント告知が楽しくなりました。",
    rating: 5,
  },
  {
    id: 2,
    name: "山本 ゆか",
    role: "ヨガインストラクター",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
    comment:
      "インスタのリンクに貼るだけなので、生徒さんへの告知が本当にスムーズ。残り枠の表示が「もう申し込まなきゃ」という気持ちにさせてくれますね。",
    rating: 5,
  },
  {
    id: 3,
    name: "鈴木 あやこ",
    role: "ネイルサロンオーナー",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face",
    comment:
      "スマホから30秒でイベントページが作れるのが最高。お客さんからも「どうやって予約したらいい？」という問い合わせがゼロになりました！",
    rating: 5,
  },
];

const FAQ_ITEMS = [
  {
    q: "無料で使えますか？",
    a: "はい、基本機能はすべて無料でご利用いただけます。クレジットカードの登録も不要で、登録から30秒でイベントを作成できます。",
  },
  {
    q: "参加者はアプリのインストールが必要ですか？",
    a: "不要です。参加者はリンクをタップして名前を入力するだけで申し込みが完了します。スマートフォンもパソコンも対応しています。",
  },
  {
    q: "何人まで参加者を管理できますか？",
    a: "イベントごとに定員を自由に設定できます。1名〜100名以上まで対応しており、残り枠のリアルタイム表示で参加者の申し込み意欲を高めます。",
  },
  {
    q: "参加者への通知はどのように送れますか？",
    a: "申し込み完了メールが自動送信されます。また、イベント前日のリマインダー通知も自動で対応しています。",
  },
  {
    q: "有料イベントの支払いはどうなりますか？",
    a: "現在は無料・有料イベントの作成・管理機能を提供しています。オンライン決済機能は近日公開予定です。",
  },
];

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function getPopularEvents(): Promise<EventWithBookingCount[]> {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return [];
    }
    const supabase = await createClient();
    const { data: events, error } = await supabase
      .from("events")
      .select(`*, booking_count:bookings(count)`)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !events) return [];

    return events
      .map((e) => {
        const raw = e.booking_count;
        const count = Array.isArray(raw)
          ? (raw[0] as { count: number } | undefined)?.count ?? 0
          : (raw as unknown as number) ?? 0;
        return { ...e, booking_count: Number(count) } as EventWithBookingCount;
      })
      .sort((a, b) => b.booking_count - a.booking_count)
      .slice(0, 3);
  } catch {
    return [];
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const popularEvents = await getPopularEvents();

  return (
    <div className="flex flex-col flex-1 min-h-dvh bg-background">
      <LandingHeader />

      <main className="flex flex-col flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#FAFAFA] px-6 py-20 sm:py-32 noise-bg">
          {/* Subtle dot-grid background pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, #1A1A1A11 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
            aria-hidden="true"
          />
          {/* Warm gradient blob top-right - larger with breathe animation */}
          <div
            className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-[#1A1A1A]/10 blur-3xl animate-breathe"
            aria-hidden="true"
          />
          {/* Sage green blob bottom-left - larger with breathe animation */}
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#404040]/10 blur-3xl animate-breathe"
            style={{ animationDelay: "2s" }}
            aria-hidden="true"
          />
          {/* Third blob - amber center-left */}
          <div
            className="pointer-events-none absolute top-1/2 -left-16 h-64 w-64 rounded-full bg-[#1A1A1A]/5 blur-3xl animate-breathe"
            style={{ animationDelay: "4s" }}
            aria-hidden="true"
          />

          {/* Floating decorative elements */}
          <div
            className="pointer-events-none absolute top-20 right-[15%] h-3 w-3 rounded-full bg-[#1A1A1A]/20 animate-float"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-40 left-[10%] h-2 w-2 rounded-full bg-[#404040]/25 animate-float-slow"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-32 right-[20%] h-4 w-4 rounded-full bg-[#1A1A1A]/15 animate-float-slow"
            style={{ animationDelay: "1s" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-1/3 right-[8%] h-2.5 w-2.5 rounded-full bg-[#404040]/20 animate-float"
            style={{ animationDelay: "2s" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-48 left-[18%] h-3.5 w-3.5 rounded-full bg-[#1A1A1A]/10 animate-float"
            style={{ animationDelay: "3s" }}
            aria-hidden="true"
          />
          {/* Organic shapes */}
          <div
            className="pointer-events-none absolute top-28 left-[25%] h-6 w-3 rounded-full bg-[#404040]/10 rotate-45 animate-float-slow"
            style={{ animationDelay: "1.5s" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-20 right-[30%] h-5 w-2.5 rounded-full bg-[#1A1A1A]/10 -rotate-12 animate-float"
            style={{ animationDelay: "0.5s" }}
            aria-hidden="true"
          />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center gap-8">
            {/* Badge */}
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm text-[#999999] font-medium shadow-sm border border-[#E5E5E5]/50">
              <span className="size-2 rounded-full bg-[#404040] inline-block animate-pulse-glow" />
              友達・サークル・先生に
            </div>

            {/* Heading */}
            <h1
              className="animate-fade-in-up delay-100 text-4xl sm:text-6xl font-bold leading-[1.15] tracking-tight text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              インスタのリンクに貼るだけで
              <br />
              <span
                className="relative inline-block"
                style={{
                  background: "linear-gradient(135deg, #1A1A1A 0%, #111111 50%, #404040 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                イベント告知完成
              </span>
            </h1>

            <p className="animate-fade-in-up delay-200 max-w-lg text-lg sm:text-xl text-[#999999] leading-relaxed">
              タイトルと日時を入力するだけ。
              <strong className="text-[#1A1A1A] font-semibold">30秒でイベントページが完成</strong>
              して、参加者はワンタップで申し込めます。
            </p>

            {/* CTAs */}
            <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row items-center gap-3 mt-2">
              <Link href="/events/new">
                <Button
                  size="lg"
                  className="h-13 px-10 text-base rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] shadow-lg hover:shadow-xl transition-all duration-200 font-semibold animate-pulse-glow"
                  style={{ height: "52px" }}
                >
                  無料ではじめる →
                </Button>
              </Link>
              <Link
                href="/explore"
                className="text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors duration-150 underline underline-offset-4 decoration-[#E5E5E5] hover:decoration-[#1A1A1A]"
              >
                イベントを見てみる
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="animate-fade-in-up delay-500 flex flex-col sm:flex-row items-center gap-4 sm:gap-8 mt-2 pt-2 border-t border-[#E5E5E5] w-full max-w-md">
              {/* Avatar stack */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[
                    "photo-1438761681033-6461ffad8d80",
                    "photo-1494790108377-be9c29b29330",
                    "photo-1534528741775-53994a69daeb",
                    "photo-1507003211169-0a1dd7228f2d",
                  ].map((id, i) => (
                    <div
                      key={i}
                      className="relative h-8 w-8 rounded-full border-2 border-[#FAFAFA] overflow-hidden bg-[#F2F2F2]"
                      style={{ zIndex: 4 - i }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://images.unsplash.com/${id}?w=64&h=64&fit=crop&crop=face`}
                        alt="利用中の先生"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <span className="text-sm text-[#999999]">
                  <strong className="text-[#1A1A1A] font-semibold">150人以上</strong>の先生が利用中
                </span>
              </div>
              <div className="text-xs text-[#999999]">
                クレジットカード不要 · 登録30秒
              </div>
            </div>

            {/* Product mockup area */}
            <div className="animate-fade-in-up delay-600 w-full max-w-2xl mt-4 rounded-2xl overflow-hidden shadow-2xl bg-white gradient-border">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 bg-[#F2F2F2] px-4 py-3 border-b border-[#E5E5E5]">
                <span className="h-3 w-3 rounded-full bg-[#1A1A1A]/40" />
                <span className="h-3 w-3 rounded-full bg-[#999999]/40" />
                <span className="h-3 w-3 rounded-full bg-[#404040]/40" />
                <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1 text-xs text-[#999999] text-center">
                  petit-event.com/e/hana-yoga-2026
                </div>
              </div>
              {/* Mockup content */}
              <div className="p-6 sm:p-8 bg-gradient-to-br from-[#FAFAFA] to-white">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F2F2F2] text-3xl">
                    🧘
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-[#404040]/10 px-2.5 py-0.5 text-xs font-medium text-[#404040]">
                        ヨガ
                      </span>
                      <span className="rounded-full bg-[#1A1A1A]/10 px-2.5 py-0.5 text-xs font-medium text-[#1A1A1A]">
                        残り2名
                      </span>
                    </div>
                    <h3
                      className="text-lg font-bold text-[#1A1A1A] leading-snug"
                      style={{ fontFamily: "var(--font-zen-maru)" }}
                    >
                      朝ヨガ体験レッスン — 初心者歓迎
                    </h3>
                    <div className="mt-2 flex flex-col gap-1 text-sm text-[#999999]">
                      <span>📅 2026年4月15日（水） 10:00〜11:30</span>
                      <span>📍 渋谷スタジオ CALM（東京都渋谷区）</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-xl bg-white border border-[#E5E5E5] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-[#1A1A1A]">参加申し込み</span>
                    <span className="text-xl font-bold text-[#1A1A1A]">¥1,500</span>
                  </div>
                  <div className="h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm font-semibold text-white shadow-sm">
                    参加を申し込む
                  </div>
                  <p className="mt-2 text-center text-xs text-[#999999]">
                    名前を入力するだけ — アプリ不要
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="w-full bg-white py-20 sm:py-24 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-14 animate-fade-in-up">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] mb-3">
                かんたん3ステップ
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                登録から告知まで
                <br className="sm:hidden" />
                <span className="text-[#1A1A1A]">3分以内</span>に完了
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  step: "01",
                  icon: "⚡",
                  iconBg: "bg-[#F7F7F7]",
                  title: "30秒でイベント作成",
                  desc: "タイトル・日時・場所・定員を入力するだけ。テンプレートを選べばさらに時短。難しい設定は一切ありません。",
                  delay: "delay-100",
                },
                {
                  step: "02",
                  icon: "🔗",
                  iconBg: "bg-[#F5F5F5]",
                  title: "リンクをインスタに貼る",
                  desc: "発行されたURLをInstagramのプロフィールリンクに貼るだけ。フォロワーがタップして申し込みページへ直行します。",
                  delay: "delay-200",
                },
                {
                  step: "03",
                  icon: "🔥",
                  iconBg: "bg-[#F7F7F7]",
                  title: "残枠で自然に埋まる",
                  desc: '残り枠数がリアルタイム表示されるから、参加者が自然と"早く申し込まなきゃ"と感じます。満員になるほど告知効果抜群。',
                  delay: "delay-300",
                },
              ].map(({ step, icon, iconBg, title, desc, delay }) => (
                <div
                  key={step}
                  className={`animate-fade-in-up ${delay} card-hover-tilt relative flex flex-col gap-5 rounded-2xl bg-[#FAFAFA] p-8 hover:shadow-md transition-shadow duration-200`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`shine-on-hover flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${iconBg}`}>
                      {icon}
                    </div>
                    <span
                      className="text-5xl font-bold leading-none select-none animate-gradient"
                      style={{
                        fontFamily: "var(--font-zen-maru)",
                        background: "linear-gradient(135deg, #E5E5E5, #1A1A1A, #404040, #E5E5E5)",
                        backgroundSize: "300% 300%",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {step}
                    </span>
                  </div>
                  <div>
                    <h3
                      className="text-lg font-bold text-[#1A1A1A] mb-2"
                      style={{ fontFamily: "var(--font-zen-maru)" }}
                    >
                      {title}
                    </h3>
                    <p className="text-sm text-[#999999] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop step connectors */}
            <div className="hidden sm:flex justify-center items-center gap-0 mt-[-10.5rem] mb-[7rem] px-16 pointer-events-none" aria-hidden="true">
              <div className="flex-1 h-px border-t-2 border-dashed border-[#1A1A1A]/20" />
              <div className="mx-4 h-2.5 w-2.5 rounded-full bg-[#1A1A1A]/30 shrink-0" />
              <div className="flex-1 h-px border-t-2 border-dashed border-[#1A1A1A]/20" />
            </div>
          </div>
        </section>

        {/* ── Popular events ───────────────────────────────────────────────── */}
        <section className="w-full bg-[#FAFAFA] py-20 sm:py-24 px-6 noise-bg">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-end justify-between mb-10 animate-fade-in-up">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] mb-2">
                  人気急上昇中
                </p>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-[#1A1A1A]"
                  style={{ fontFamily: "var(--font-zen-maru)" }}
                >
                  人気のイベント
                </h2>
              </div>
              <Link
                href="/explore?sort=popular"
                className="text-sm text-[#1A1A1A] hover:text-[#111111] font-medium transition-colors duration-150 whitespace-nowrap"
              >
                もっと見る →
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {popularEvents.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  datetime={event.datetime}
                  location={event.location ?? ""}
                  price={event.price}
                  capacity={event.capacity ?? 0}
                  booked_count={event.booking_count}
                  image_url={event.image_url ?? undefined}
                  category={event.category ?? undefined}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Category grid ────────────────────────────────────────────────── */}
        <section className="w-full bg-white py-20 sm:py-24 px-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-end justify-between mb-10 animate-fade-in-up">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] mb-2">
                  カテゴリ
                </p>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-[#1A1A1A]"
                  style={{ fontFamily: "var(--font-zen-maru)" }}
                >
                  カテゴリから探す
                </h2>
              </div>
              <Link
                href="/explore"
                className="text-sm text-[#1A1A1A] hover:text-[#111111] font-medium transition-colors duration-150 whitespace-nowrap"
              >
                すべて見る →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {CATEGORIES.map((cat, i) => (
                <Link
                  key={cat}
                  href={`/explore?category=${encodeURIComponent(cat)}`}
                  className={`animate-fade-in-up ${
                    i < 2 ? "delay-100" : i < 4 ? "delay-200" : i < 6 ? "delay-300" : "delay-400"
                  } card-hover-lift group flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br ${CATEGORY_COLORS[cat] ?? "from-gray-100 to-gray-50"} p-6 text-center ring-1 ring-[#E5E5E5] hover:ring-[#1A1A1A]/30 hover:shadow-md transition-all duration-200`}
                >
                  <span className="text-4xl group-hover:scale-125 transition-transform duration-200">
                    {CATEGORY_ICONS[cat] ?? "✨"}
                  </span>
                  <span
                    className="text-sm font-bold text-[#1A1A1A]"
                    style={{ fontFamily: "var(--font-zen-maru)" }}
                  >
                    {cat}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────────────────── */}
        <section className="w-full bg-[#FAFAFA] py-20 sm:py-24 px-6 noise-bg">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-14 animate-fade-in-up">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] mb-3">
                ご利用の声
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                先生たちからの
                <br className="sm:hidden" />
                リアルな声
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.id}
                  className={`animate-fade-in-up ${
                    i === 0 ? "delay-100" : i === 1 ? "delay-200" : "delay-300"
                  } card-hover-tilt flex flex-col gap-5 rounded-2xl bg-white p-7 ring-1 ring-[#E5E5E5] hover:ring-[#1A1A1A]/30 transition-all duration-300`}
                >
                  {/* Quote mark */}
                  <div
                    className="text-7xl leading-none select-none"
                    aria-hidden="true"
                    style={{
                      fontFamily: "Georgia, serif",
                      background: "linear-gradient(135deg, #1A1A1A 0%, #404040 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      opacity: 0.3,
                    }}
                  >
                    &ldquo;
                  </div>
                  <p className="text-sm leading-relaxed text-[#555555] -mt-3 flex-1">
                    {t.comment}
                  </p>
                  {/* Stars */}
                  <div className="flex gap-0.5" aria-label={`${t.rating}点`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={s <= t.rating ? "text-[#1A1A1A]" : "text-[#E5E5E5]"}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  {/* Author */}
                  <div className="flex items-center gap-3 pt-3 border-t border-[#E5E5E5]">
                    <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden bg-[#F2F2F2]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{t.name}</p>
                      <p className="text-xs text-[#999999]">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="w-full bg-white py-20 sm:py-24 px-6">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-12 animate-fade-in-up">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A] mb-3">
                FAQ
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                よくある質問
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {FAQ_ITEMS.map((item, i) => (
                <details
                  key={i}
                  className={`animate-fade-in-up ${
                    i < 2 ? "delay-100" : i < 4 ? "delay-200" : "delay-300"
                  } group rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] overflow-hidden transition-all duration-300 open:border-l-[3px] open:border-l-[#1A1A1A] open:shadow-sm`}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors duration-150 list-none">
                    <span>{item.q}</span>
                    <span
                      className="shrink-0 text-[#1A1A1A] transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <div className="px-6 pb-5 pt-1 text-sm text-[#999999] leading-relaxed border-t border-[#E5E5E5]">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-[#1A1A1A] px-6 py-20 sm:py-28 animate-gradient" style={{ backgroundSize: "200% 200%" }}>
          {/* Subtle dot pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle, #1A1A1A33 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden="true"
          />
          {/* Terracotta blob - animated */}
          <div
            className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-[#1A1A1A]/20 blur-3xl translate-x-1/2 -translate-y-1/2 animate-breathe"
            aria-hidden="true"
          />
          {/* Sage blob - animated */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#404040]/20 blur-3xl -translate-x-1/3 translate-y-1/3 animate-breathe"
            style={{ animationDelay: "3s" }}
            aria-hidden="true"
          />

          {/* Floating decorative particles */}
          <div
            className="pointer-events-none absolute top-16 left-[15%] h-2 w-2 rounded-full bg-[#1A1A1A]/30 animate-float"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-24 right-[25%] h-1.5 w-1.5 rounded-full bg-[#404040]/30 animate-float-slow"
            style={{ animationDelay: "1s" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-20 left-[30%] h-2.5 w-2.5 rounded-full bg-[#1A1A1A]/25 animate-float"
            style={{ animationDelay: "2s" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-32 right-[15%] h-2 w-2 rounded-full bg-[#404040]/25 animate-float-slow"
            style={{ animationDelay: "0.5s" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-1/2 left-[8%] h-3 w-3 rounded-full bg-[#1A1A1A]/15 animate-float"
            style={{ animationDelay: "1.5s" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-1/3 right-[10%] h-1.5 w-1.5 rounded-full bg-[#404040]/20 animate-float-slow"
            style={{ animationDelay: "3.5s" }}
            aria-hidden="true"
          />

          <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center gap-6">
            <span className="text-4xl animate-float-slow" aria-hidden="true">🎉</span>
            <h2
              className="animate-fade-in-up text-3xl sm:text-5xl font-bold text-white leading-tight"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              あなたのイベントを
              <br />
              <span className="text-[#1A1A1A]">今すぐ</span>告知しよう
            </h2>
            <p className="animate-fade-in-up delay-100 text-[#999999] text-base sm:text-lg max-w-md">
              無料で始められます。クレジットカードも不要。
              <br />
              150人以上の先生がすでに活用中です。
            </p>
            <div className="animate-fade-in-up delay-200 flex flex-col sm:flex-row items-center gap-4 mt-2">
              <Link href="/events/new">
                <Button
                  size="lg"
                  className="shine-on-hover h-14 px-12 text-base rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] shadow-xl hover:shadow-2xl transition-all duration-200 font-semibold"
                  style={{ height: "56px" }}
                >
                  無料ではじめる →
                </Button>
              </Link>
              <Link
                href="/explore"
                className="text-sm text-[#999999] hover:text-white transition-colors duration-150"
              >
                まずイベントを見てみる
              </Link>
            </div>
            <p className="animate-fade-in-up delay-300 text-xs text-[#999999]/60 mt-2">
              登録30秒 · クレジットカード不要 · すぐに使い始められます
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
