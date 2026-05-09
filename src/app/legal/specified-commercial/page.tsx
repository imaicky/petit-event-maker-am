import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "プチイベント作成くんの特定商取引法に基づく表記",
};

export default function SpecifiedCommercialPage() {
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
          特定商取引法に基づく表記
        </h1>
        <p className="mb-8 text-xs text-[#999999]">最終改定日: 2026年5月9日</p>

        <article className="prose prose-sm max-w-none text-sm text-[#333333] leading-relaxed">
          <table className="w-full border-collapse">
            <tbody className="divide-y divide-[#E5E5E5]">
              <Row label="販売事業者">
                {/* TODO: 個人事業主名 / 法人名を記入 */}
                峰川あゆみ
              </Row>
              <Row label="運営責任者">
                {/* TODO: 代表者氏名を記入 */}
                峰川あゆみ
              </Row>
              <Row label="所在地">
                {/* TODO: 連絡可能な所在地を記入。請求があった場合に遅滞なく開示できる場合は「請求があった場合は遅滞なく開示します」でも可 */}
                請求があった場合は遅滞なく開示します
              </Row>
              <Row label="電話番号">
                {/* TODO: 連絡可能な電話番号を記入。請求があった場合に遅滞なく開示できる場合は「請求があった場合は遅滞なく開示します」でも可 */}
                請求があった場合は遅滞なく開示します
              </Row>
              <Row label="メールアドレス">imatoru@gmail.com</Row>
              <Row label="サービス名">プチイベント作成くん</Row>
              <Row label="サービスURL">
                <a
                  href="https://petit-event-maker-am.vercel.app"
                  className="underline"
                >
                  https://petit-event-maker-am.vercel.app
                </a>
              </Row>

              <Row label="販売価格">
                各イベントページに表示される金額（税込）。<br />
                プラットフォーム手数料は主催者が負担し、参加者の支払金額には影響しません。
              </Row>
              <Row label="商品代金以外の必要料金">
                通信料は利用者負担。決済手数料は主催者負担（Stripe決済の場合）。
              </Row>
              <Row label="支払方法">
                クレジットカード（Stripe決済）<br />
                銀行振込（主催者が個別に対応）<br />
                現地払い（主催者が個別に対応）<br />
                その他（主催者が個別に指定）
              </Row>
              <Row label="支払時期">
                クレジットカード: イベント申込時に決済<br />
                銀行振込: 主催者の指定する期日まで（通常イベント開催前）<br />
                現地払い: イベント当日
              </Row>
              <Row label="サービス提供時期">
                各イベントページに記載の開催日時
              </Row>
              <Row label="サービス内容">
                本サービスは、主催者が開催するイベントの告知・申込受付・決済仲介を行うプラットフォームです。
                イベントそのものの内容・運営・実施は各主催者が行います。
              </Row>
              <Row label="返品・キャンセル">
                <p>
                  各イベントのキャンセルポリシーは主催者ごとに異なります。各イベントページおよび主催者からの案内をご確認ください。
                </p>
                <p className="mt-2">
                  原則として、デジタル/イベント参加権の性質上、申込確定後の自己都合キャンセルによる返金は主催者の判断によります。
                </p>
              </Row>
              <Row label="動作環境">
                推奨ブラウザ: Google Chrome 最新版 / Safari 最新版 / Firefox 最新版 / Edge 最新版
              </Row>
              <Row label="加盟店審査">
                有料イベントを開催する主催者は、Stripe等の決済代行サービスの加盟店審査を経る必要があります。
              </Row>
            </tbody>
          </table>
        </article>

        <p className="mt-10 text-xs text-[#999999]">
          ※ 本表記は2026年5月9日制定。お問い合わせは上記メールアドレスまでご連絡ください。
        </p>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="align-top">
      <th className="w-1/3 py-3 pr-3 text-left text-xs font-bold text-[#666666]">
        {label}
      </th>
      <td className="py-3 text-[#1A1A1A]">{children}</td>
    </tr>
  );
}
