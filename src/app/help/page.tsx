import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import {
  CalendarPlus,
  Users,
  CreditCard,
  MessageSquare,
  Bell,
  Share2,
  Image as ImageIcon,
  Settings,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "使い方ガイド | プチイベント作成くん",
  description:
    "プチイベント作成くんの使い方を解説。イベント作成・集金設定・LINE連携・参加者管理などをステップバイステップで紹介します。",
};

type Step = {
  no: string;
  title: string;
  desc: string;
  href?: string;
  cta?: string;
};

type Section = {
  id: string;
  icon: React.ReactNode;
  title: string;
  intro: string;
  steps: Step[];
};

const sections: Section[] = [
  {
    id: "first-event",
    icon: <CalendarPlus className="h-5 w-5" />,
    title: "はじめてのイベントを作る",
    intro:
      "アカウント登録後、最初のイベントを公開するまで30秒。テンプレートに沿って入力するだけで申込ページが完成します。",
    steps: [
      {
        no: "1",
        title: "ダッシュボードから「イベントを作る」をタップ",
        desc: "右上の作成ボタン、または空状態カードのCTAから新規作成画面へ。",
      },
      {
        no: "2",
        title: "タイトル・日時・場所を入力",
        desc: "オフライン会場の場合は住所、オンラインの場合はZoom情報（URL/ID/パスコード）を入力します。",
      },
      {
        no: "3",
        title: "サムネイル画像をアップロード",
        desc: "正方形 1:1 推奨。スマホで撮った写真をそのままアップロードできます。",
      },
      {
        no: "4",
        title: "公開して、URLをシェア",
        desc: "公開ボタンを押すと専用URL（短いコード）が発行されます。Instagram のプロフィール、LINE 公式、X などに貼り付けるだけ。",
        href: "/events/new",
        cta: "イベントを作成する",
      },
    ],
  },
  {
    id: "payment",
    icon: <CreditCard className="h-5 w-5" />,
    title: "集金方法を設定する",
    intro:
      "Stripe オンライン決済 / 現地払い / 独自案内 の3つから選べます。複数併用も可能です。",
    steps: [
      {
        no: "1",
        title: "イベント編集画面 → 集金方法セクション",
        desc: "「集金方法を選ぶ」エリアで、希望する受け取り方法のチェックを入れます。",
      },
      {
        no: "2",
        title: "Stripe を有効化（オンライン決済）",
        desc: "設定 → 集金 → Stripe Secret Key を貼り付けるだけで自動連携。クレジットカード・Apple Pay 対応で、キャンセル時は自動返金。",
        href: "/settings/stripe",
        cta: "Stripe を設定する",
      },
      {
        no: "3",
        title: "現地払い",
        desc: "「会場で現金 / PayPay でお支払いください」など、申込完了画面とメールで自動案内されます。",
      },
      {
        no: "4",
        title: "独自案内",
        desc: "銀行振込先・PayPay リンクなど、自由なテキストで支払い案内を表示できます。",
      },
    ],
  },
  {
    id: "line",
    icon: <MessageSquare className="h-5 w-5" />,
    title: "LINE 公式アカウントを連携",
    intro:
      "LINE 公式アカウントと連携すると、フォロワー全員にイベント告知をワンタップで配信できます。リマインダー通知も自動。",
    steps: [
      {
        no: "1",
        title: "LINE Developers でチャネルを作成",
        desc: "Messaging API のチャネルを作成し、チャネル ID / シークレット / アクセストークンを取得します。",
      },
      {
        no: "2",
        title: "設定 → LINE連携 から情報を貼付",
        desc: "取得した3つの値を入力するだけで連携完了。詳細手順はマニュアル参照。",
        href: "/settings/line/guide",
        cta: "LINE連携ガイドを見る",
      },
      {
        no: "3",
        title: "イベント作成時に「LINE通知」をオン",
        desc: "公開時にフォロワー全員へ自動通知。前日・当日のリマインダーも自動送信されます。",
      },
    ],
  },
  {
    id: "attendees",
    icon: <Users className="h-5 w-5" />,
    title: "参加者を管理する",
    intro:
      "申込者の確認、出欠記録、メール一斉送信、CSV エクスポートまで、ダッシュボードからまとめて操作できます。",
    steps: [
      {
        no: "1",
        title: "イベント詳細 → 参加者一覧",
        desc: "申込者の氏名・連絡先・申込日時・支払い状況を一覧表示。",
      },
      {
        no: "2",
        title: "出欠を記録",
        desc: "当日の出欠をワンタップで記録。次回イベントの集客分析に活用できます。",
      },
      {
        no: "3",
        title: "CSV エクスポート",
        desc: "参加者リストを CSV ダウンロード。会計報告や名簿整理に。",
      },
      {
        no: "4",
        title: "確認メール再送信",
        desc: "「メールが届かない」と参加者から問い合わせが来たら、参加者一覧から1クリックで再送できます。",
      },
    ],
  },
  {
    id: "reminders",
    icon: <Bell className="h-5 w-5" />,
    title: "リマインダー通知",
    intro:
      "イベント前日・当日に、参加者へメール＋LINE で自動リマインダーを送信。設定不要・全自動です。",
    steps: [
      {
        no: "1",
        title: "前日 18:00 に送信",
        desc: "参加者全員に「明日はイベント当日です」とメール＋LINE で通知。",
      },
      {
        no: "2",
        title: "当日 開始2時間前に送信",
        desc: "「あと少しで開始です」と最終リマインダー。場所・URL の再案内付き。",
      },
      {
        no: "3",
        title: "ドタキャン削減",
        desc: "通知を見たうえでキャンセルは1タップで可能。当日のキャパシティ管理がラクになります。",
      },
    ],
  },
  {
    id: "share",
    icon: <Share2 className="h-5 w-5" />,
    title: "イベントを宣伝する",
    intro: "作ったイベントを最短ルートで届けるための機能群。",
    steps: [
      {
        no: "1",
        title: "Instagram ストーリーズ画像を生成",
        desc: "イベント詳細 → 「ストーリーズ画像」ボタンで縦型画像を自動生成。そのまま投稿できます。",
      },
      {
        no: "2",
        title: "短縮URL でシェア",
        desc: "全イベントに短いコード付き URL が発行されます。SNS のプロフィールリンクに最適。",
      },
      {
        no: "3",
        title: "LINE で告知",
        desc: "LINE 連携済みなら、公開時にフォロワー全員に画像付きカードを配信できます。",
      },
      {
        no: "4",
        title: "/探索 でも露出",
        desc: "公開イベントは /explore に自動掲載。カレンダー表示・カテゴリ絞り込みで他のユーザーから発見されます。",
      },
    ],
  },
  {
    id: "settings",
    icon: <Settings className="h-5 w-5" />,
    title: "プロフィール・各種設定",
    intro: "ユーザー名、アイコン、リンク集（プチリンク）、各種連携の設定。",
    steps: [
      {
        no: "1",
        title: "ユーザー名を設定",
        desc: "/設定 → プロフィール からユニークなユーザー名を設定。あなた専用の URL が `/[username]` で発行されます。",
      },
      {
        no: "2",
        title: "プチリンク（リンク集）",
        desc: "Linktree のようなリンク集ページ。Instagram のプロフィールに貼って、過去・進行中・予定の全イベントへ誘導できます。",
      },
      {
        no: "3",
        title: "サービスメニュー",
        desc: "日付に依存しない定期サービス（ヨガ月額、ネイルメニューなど）を公開。お客様が好きなタイミングで申込可能。",
      },
    ],
  },
];

const faqs = [
  {
    q: "アカウント登録は無料ですか？",
    a: "はい、完全無料です。クレジットカード登録も不要で、メールアドレス＋パスワードだけで登録できます。",
  },
  {
    q: "登録後にメールが届きません",
    a: "件名「プチイベント作成くん」で迷惑メールフォルダ・プロモーションタブも確認してください。届かない場合はログイン画面の「再送信」ボタンから再度送信できます。",
  },
  {
    q: "Stripe 決済の手数料は？",
    a: "Stripe 標準の決済手数料（3.6%）のみ。プチイベント作成くん側の手数料は0円です。",
  },
  {
    q: "イベントを途中で公開停止できますか？",
    a: "はい、ダッシュボードからいつでも非公開・キャンセル処理が可能です。キャンセル時は参加者に自動メール通知＋ Stripe 自動返金が走ります。",
  },
  {
    q: "1人で複数のイベントを管理できますか？",
    a: "はい、イベント数の上限はありません。同時に複数イベントを公開・管理できます。",
  },
];

export default function HelpPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAFAFA] pb-20">
        {/* Hero */}
        <section className="bg-white px-6 py-12 sm:py-16 border-b border-[#E5E5E5]">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F2F2] mb-4">
              <HelpCircle className="h-6 w-6 text-[#1A1A1A]" />
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-3"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              使い方ガイド
            </h1>
            <p className="text-sm sm:text-base text-[#666666] leading-relaxed">
              はじめての方も、もっと活用したい方も。
              <br className="sm:hidden" />
              プチイベント作成くんの全機能をステップ順に解説します。
            </p>
          </div>
        </section>

        {/* Quick links */}
        <section className="px-6 py-8 border-b border-[#E5E5E5] bg-white">
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#999999] mb-3">
              目次
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2 rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-xs font-medium text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
                >
                  <span className="text-[#666666]">{s.icon}</span>
                  <span className="truncate">{s.title}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Sections */}
        <div className="mx-auto max-w-3xl px-6 py-10 space-y-12">
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-20">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A1A] text-white shrink-0">
                  {section.icon}
                </div>
                <div>
                  <h2
                    className="text-xl sm:text-2xl font-bold text-[#1A1A1A]"
                    style={{ fontFamily: "var(--font-zen-maru)" }}
                  >
                    {section.title}
                  </h2>
                  <p className="text-sm text-[#666666] mt-1 leading-relaxed">
                    {section.intro}
                  </p>
                </div>
              </div>

              <ol className="mt-5 space-y-3">
                {section.steps.map((step) => (
                  <li
                    key={step.no}
                    className="rounded-2xl border border-[#E5E5E5] bg-white p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#1A1A1A] shrink-0">
                        {step.no}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A]">
                          {step.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#666666] mt-1 leading-relaxed">
                          {step.desc}
                        </p>
                        {step.href && step.cta && (
                          <Link
                            href={step.href}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1A1A1A] hover:underline"
                          >
                            {step.cta}
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}

          {/* FAQ */}
          <section id="faq" className="scroll-mt-20">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A1A1A] text-white shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h2
                className="text-xl sm:text-2xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                よくある質問
              </h2>
            </div>
            <div className="space-y-2">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-[#E5E5E5] bg-white p-4 sm:p-5"
                >
                  <summary className="flex items-center justify-between cursor-pointer text-sm sm:text-base font-bold text-[#1A1A1A] list-none">
                    <span>{f.q}</span>
                    <span className="ml-2 text-[#999999] group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm text-[#666666] leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="rounded-3xl bg-[#1A1A1A] text-white p-8 sm:p-10 text-center">
            <ImageIcon className="h-8 w-8 mx-auto mb-3 opacity-70" />
            <h2
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              準備はOKですか？
            </h2>
            <p className="text-sm text-white/80 mb-6">
              30秒で最初のイベントを公開できます。
            </p>
            <Link
              href="/events/new"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#1A1A1A] px-6 py-3 text-sm font-bold hover:bg-[#F2F2F2] transition-colors"
            >
              イベントを作りはじめる
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
