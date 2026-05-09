import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "利用規約",
  description: "プチイベント作成くんの利用規約",
};

export default function TermsPage() {
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

        <h1 className="mb-2 text-3xl font-bold text-[#1A1A1A]">利用規約</h1>
        <p className="mb-8 text-xs text-[#999999]">最終改定日: 2026年5月9日</p>

        <article className="prose prose-sm max-w-none space-y-6 text-sm text-[#333333] leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第1条（適用）</h2>
            <p>
              本規約は、運営者が提供する「プチイベント作成くん」（以下「本サービス」といいます）の利用条件を定めるものです。利用者は本サービスを利用することで本規約に同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第2条（用語の定義）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>「主催者」とは、本サービス上でイベントを作成・公開する利用者をいいます。</li>
              <li>「参加者」とは、主催者が公開するイベントに申込みをする利用者をいいます。</li>
              <li>「運営者」とは、本サービスを提供する事業者をいいます。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第3条（本サービスの位置づけ）</h2>
            <p>
              本サービスは、主催者と参加者を結びつけるイベント告知・申込受付・決済仲介プラットフォームです。イベントそのものの主催・運営・実施は主催者が行うものであり、運営者はイベントの内容・品質について保証しません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第4条（アカウント登録）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>本サービスの一部機能は、メールアドレスまたは外部認証（Google / X / LINE）によるアカウント登録を必要とします。</li>
              <li>利用者は、登録情報を正確かつ最新に保つ責任を負います。</li>
              <li>未成年者は、保護者の同意のもとで本サービスを利用するものとします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第5条（料金・手数料）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>無料イベントの作成・参加は無料です。</li>
              <li>有料イベントの決済は Stripe 等の決済代行サービスを通じて行われます。</li>
              <li>運営者は、有料イベントの取引に対し所定のプラットフォーム手数料（標準5％）を徴収する場合があります。</li>
              <li>Stripe 等の決済手数料は、別途主催者または参加者の負担となります。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第6条（主催者の責務）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>主催者はイベントの内容・運営・参加者対応について全責任を負います。</li>
              <li>主催者は法令・公序良俗に反するイベントを開催してはなりません。</li>
              <li>主催者は参加者から取得した個人情報を本イベント目的の範囲内でのみ利用するものとします。</li>
              <li>有料イベントを開催する場合、主催者は特定商取引法その他関連法令に従う責任を負います。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第7条（参加者の責務）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>参加者は、申込み内容を正確に入力する責任を負います。</li>
              <li>参加者はイベント当日、主催者の指示・会場規則に従うものとします。</li>
              <li>キャンセルおよび返金は各イベントの規定に従い、主催者と参加者間で対応するものとします。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第8条（禁止事項）</h2>
            <p>利用者は以下の行為を行ってはなりません。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>法令・公序良俗・本規約に違反する行為</li>
              <li>第三者の権利・名誉・プライバシーを侵害する行為</li>
              <li>虚偽情報の登録・なりすまし</li>
              <li>本サービスの運営を妨害する行為（不正アクセス、過剰なリクエストの送信等）</li>
              <li>マネーロンダリング、詐欺、無権限な営業等の不正利用</li>
              <li>運営者または第三者の知的財産権を侵害する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第9条（コンテンツの権利）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>主催者・参加者が本サービスに投稿したコンテンツの著作権は、当該投稿者に帰属します。</li>
              <li>投稿者は、運営者が本サービス提供のために必要な範囲（表示、保存、配信、改変、第三者への公開等）で投稿コンテンツを利用することを許諾するものとします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第10条（免責）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>運営者はイベントの内容・運営・キャンセル・トラブルについて一切責任を負いません。</li>
              <li>運営者は、本サービスの中断・停止・終了・障害等によって生じた損害について責任を負いません。</li>
              <li>運営者は、利用者間で生じた紛争について介入・調停の義務を負いません。</li>
              <li>運営者の責任は、運営者の故意または重大な過失による場合を除き、当該利用者が直近1ヶ月に支払った手数料の総額を上限とします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第11条（個人情報の取り扱い）</h2>
            <p>
              個人情報の取り扱いは、別途定める <Link href="/legal/privacy" className="underline">プライバシーポリシー</Link> に従います。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第12条（規約の変更）</h2>
            <p>
              運営者は、必要に応じて本規約を変更できるものとします。重要な変更については本サービス上で通知し、通知後の継続利用をもって同意とみなします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#1A1A1A]">第13条（準拠法・管轄）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>本規約は日本法に準拠します。</li>
              <li>本サービスに関する一切の紛争は、運営者の本店所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</li>
            </ol>
          </section>
        </article>

        <p className="mt-10 text-xs text-[#999999]">
          ※ 本規約は2026年5月9日制定。お問い合わせ先は <Link href="/legal/specified-commercial" className="underline">特定商取引法に基づく表記</Link> をご確認ください。
        </p>
      </div>
    </main>
  );
}
