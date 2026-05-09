import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "プチイベント作成くんのプライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#FAFAFA] py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          トップに戻る
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-[#1A1A1A]">
          プライバシーポリシー
        </h1>
        <p className="mb-8 text-xs text-[#999999]">最終改定日: 2026年5月9日</p>

        <article className="prose prose-sm max-w-none space-y-6 text-sm text-[#333333] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">1. 基本方針</h2>
            <p>
              プチイベント作成くん（以下「本サービス」）の運営者は、利用者の個人情報を適切に保護することを重要な責務と認識し、個人情報保護法その他関連法令を遵守し、適切な取り扱いを行います。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">2. 取得する情報</h2>
            <p>本サービスでは以下の情報を取得します。</p>
            <h3 className="mt-3 text-sm font-bold text-[#1A1A1A]">2.1 主催者から取得する情報</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>氏名・表示名・メールアドレス・LINE公式アカウント情報</li>
              <li>Stripe / 決済情報（連携時のアカウントIDのみ・カード情報は当サービスに保存されません）</li>
              <li>プロフィール情報（自己紹介、SNSリンク、アバター画像等）</li>
              <li>イベント情報（タイトル、説明、画像、参加者情報）</li>
            </ul>
            <h3 className="mt-3 text-sm font-bold text-[#1A1A1A]">2.2 参加者から取得する情報</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>氏名・メールアドレス・電話番号（任意）</li>
              <li>主催者がカスタムフィールドで設定した追加情報</li>
              <li>クレジットカード情報（Stripeに直接送信され、当サービスに保存されません）</li>
            </ul>
            <h3 className="mt-3 text-sm font-bold text-[#1A1A1A]">2.3 自動的に取得する情報</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>アクセスログ・IPアドレス・ブラウザ情報・端末情報</li>
              <li>閲覧履歴（イベント詳細ページ）と参照元（リファラ・UTMパラメータ）</li>
              <li>クッキー（匿名ID・セッション管理用）</li>
              <li>解析ツール（PostHog等）による行動データ</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">3. 利用目的</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>本サービスの提供・運営・改善</li>
              <li>イベント申込み・決済・通知の処理</li>
              <li>主催者と参加者間の連絡仲介</li>
              <li>サービスの利用状況解析と機能改善</li>
              <li>主催者向けインサイト機能（参加者属性の集計表示・個人特定なし）</li>
              <li>レコメンド機能（興味に合うイベントの提案）</li>
              <li>カスタマーサポート対応</li>
              <li>不正利用の防止・調査</li>
              <li>法令遵守</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">4. 第三者提供</h2>
            <p>運営者は、以下の場合を除き、利用者の個人情報を第三者に提供しません。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>利用者の同意がある場合</li>
              <li>主催者への参加者情報の提供（イベント申込み目的の範囲内）</li>
              <li>法令に基づく開示請求があった場合</li>
              <li>人の生命・身体・財産の保護のために緊急に必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">5. 業務委託</h2>
            <p>
              本サービスは、以下の外部サービスを業務委託先として利用しています。各社のプライバシーポリシーは各社のWebサイトをご参照ください。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Vercel Inc.（ホスティング）</li>
              <li>Supabase Inc.（データベース・認証・ストレージ）</li>
              <li>Stripe, Inc.（決済処理）</li>
              <li>LINEヤフー株式会社（メッセージング）</li>
              <li>Resend, Inc.（メール送信）</li>
              <li>PostHog Inc.（行動分析）</li>
              <li>Anthropic, PBC（AI生成機能）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">6. データ保管期間</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>予約データ・決済ログ: 取引完了後3年間（特商法・税法対応）</li>
              <li>解析ログ: 90日</li>
              <li>退会後の個人データ: 30日以内に削除</li>
              <li>法令で保管が義務付けられているデータ: 関連法令で定められた期間</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">7. 安全管理措置</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>通信はTLS/SSLで暗号化</li>
              <li>データベースはRow Level Security (RLS) による行単位アクセス制御</li>
              <li>Stripe等の決済情報はPCI DSS準拠の事業者に直接送信され、当サービスには保存されません</li>
              <li>不正アクセスの監視と対策</li>
              <li>従業者への教育・監督</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">8. 利用者の権利</h2>
            <p>利用者は、運営者に対し以下を請求できます。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>保有個人データの開示・訂正・削除・利用停止</li>
              <li>第三者提供の停止</li>
              <li>アカウント削除</li>
            </ul>
            <p className="mt-2">
              請求は <Link href="/legal/specified-commercial" className="underline">特定商取引法に基づく表記</Link> 記載のお問い合わせ先までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">9. クッキーの利用</h2>
            <p>
              本サービスはセッション管理・行動解析・閲覧トラッキングのためにクッキーを利用します。ブラウザの設定でクッキーを無効化できますが、その場合一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">10. 改定</h2>
            <p>
              本ポリシーは、必要に応じて変更されることがあります。重要な変更がある場合は本サービス上で通知します。
            </p>
          </section>
        </article>

        <p className="mt-10 text-xs text-[#999999]">
          お問い合わせ先: <Link href="/legal/specified-commercial" className="underline">特定商取引法に基づく表記</Link> 参照
        </p>
      </div>
    </main>
  );
}
