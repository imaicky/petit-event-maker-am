import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Lightbulb,
  CheckCircle2,
  Info,
  CreditCard,
  Shield,
  Key,
  TestTube,
  Rocket,
} from "lucide-react";
import { Header } from "@/components/header";

// ─── Reusable building blocks ─────────────────────────────────

function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#D1D5DB] shadow-lg overflow-hidden bg-white">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F3F4F6] border-b border-[#E5E7EB]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
          <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
        </div>
        <div className="flex-1 ml-2">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-[#9CA3AF] font-mono truncate border border-[#E5E7EB]">
            {url}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Highlight({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#635BFF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
        {label}
      </span>
      <div className="ring-2 ring-[#635BFF] ring-offset-2 rounded-md">
        {children}
      </div>
    </div>
  );
}

function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mt-4">
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-800 leading-relaxed">{children}</div>
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl bg-[#635BFF]/5 border border-[#635BFF]/20 px-4 py-3 mt-4">
      <Lightbulb className="h-4 w-4 text-[#635BFF] shrink-0 mt-0.5" />
      <div className="text-sm text-[#4a45b3] leading-relaxed">{children}</div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 mt-4">
      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
      <div className="text-sm text-blue-800 leading-relaxed">{children}</div>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#635BFF] text-white text-sm font-bold">
      {n}
    </div>
  );
}

// ─── Step mockups ─────────────────────────────────────────────

function Step1Mockup() {
  return (
    <BrowserFrame url="stripe.com">
      <div className="p-4 sm:p-6 bg-[#FAFAFA] min-h-[180px] space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-[#635BFF] flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <span className="text-sm font-medium text-[#1A1A1A]">Stripe</span>
        </div>
        <div className="space-y-3">
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5">
            <div className="text-[11px] text-[#999]">メールアドレス</div>
            <div className="bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#999] mt-1">
              your-email@example.com
            </div>
          </div>
          <Highlight label="無料でアカウント作成">
            <button className="bg-[#635BFF] text-white text-sm font-medium px-4 py-2.5 rounded-lg w-full text-center">
              今すぐ始める
            </button>
          </Highlight>
        </div>
        <div className="text-[11px] text-[#999] mt-2">
          メールアドレスの確認後、ビジネス情報を入力して完了
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step2Mockup() {
  return (
    <BrowserFrame url="dashboard.stripe.com/test/apikeys">
      <div className="flex min-h-[280px]">
        {/* Sidebar */}
        <div className="w-[180px] bg-[#F7F8FA] border-r border-[#E5E7EB] flex flex-col justify-between py-3 px-2 shrink-0 hidden sm:flex">
          <div className="space-y-1">
            <div className="text-[10px] text-[#666] px-2 py-1">ホーム</div>
            <div className="text-[10px] text-[#666] px-2 py-1">取引</div>
            <div className="text-[10px] text-[#666] px-2 py-1">顧客</div>
            <div className="text-[10px] text-[#999] px-2 py-1">...</div>
          </div>
          <div className="space-y-2 border-t border-[#E5E7EB] pt-2">
            <Highlight label="ここをクリック！">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white border border-[#E5E5E5]">
                <div className="text-[10px] font-medium text-[#1A1A1A]">開発者</div>
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-[9px] text-[#FF8C00] font-medium">テストモード</span>
                  <div className="w-6 h-3.5 bg-[#FF8C00] rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </Highlight>
          </div>
        </div>
        {/* Main content */}
        <div className="flex-1 p-4 sm:p-6 bg-[#FAFAFA] space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-[#1A1A1A]">開発者 &gt; API キー</div>
            <div className="flex items-center gap-1">
              <span className="bg-[#FF8C00]/10 text-[#FF8C00] text-[10px] font-medium px-2 py-0.5 rounded-full">
                テストモード
              </span>
            </div>
          </div>
          <div className="sm:hidden mb-3">
            <Highlight label="左下の「開発者」横にトグルあり">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white border border-[#E5E5E5] w-fit">
                <span className="text-[10px] font-medium text-[#1A1A1A]">開発者</span>
                <span className="text-[9px] text-[#FF8C00] font-medium">テストモード</span>
                <div className="w-6 h-3.5 bg-[#FF8C00] rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-2.5 h-2.5 bg-white rounded-full" />
                </div>
              </div>
            </Highlight>
          </div>
          <div className="space-y-3">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
              <div className="text-[11px] text-[#999]">公開可能キー</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#666] truncate">
                  pk_test_あなたの公開キー
                </div>
                <div className="bg-[#F2F2F2] text-[#666] text-[11px] px-2 py-1 rounded shrink-0">
                  コピー
                </div>
              </div>
            </div>
            <Highlight label="「＋ シークレットキーを作成」をクリック">
              <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
                <div className="text-[11px] text-[#999]">シークレットキー</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#666] truncate">
                    sk_test_あなたのシークレットキーxxxxxxxx
                  </div>
                  <div className="bg-[#635BFF] text-white text-[11px] px-2 py-1 rounded shrink-0">
                    表示
                  </div>
                </div>
              </div>
            </Highlight>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────

function FAQItem({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-[#1A1A1A] hover:bg-[#FAFAFA] transition-colors list-none [&::-webkit-details-marker]:hidden">
        <span>{q}</span>
        <ChevronDown className="h-4 w-4 text-[#999] transition-transform group-open:rotate-180 shrink-0 ml-2" />
      </summary>
      <div className="px-5 pb-4 text-sm text-[#666] leading-relaxed border-t border-[#F2F2F2] pt-3">
        {children}
      </div>
    </details>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function StripeSetupGuidePage() {
  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        {/* Back link */}
        <Link
          href="/settings/stripe"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Stripe決済設定へ戻る
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#635BFF]/10">
              <CreditCard className="h-5 w-5 text-[#635BFF]" />
            </div>
            <h1
              className="text-2xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              Stripe決済 セットアップガイド
            </h1>
          </div>
          <p className="mt-3 text-sm text-[#666] leading-relaxed">
            Stripeと連携すると、有料イベントの参加費をクレジットカードで安全に受け取ることができます。
            このガイドでは、Stripeアカウントの作成からテスト決済まで、初めての方でも迷わず設定できるよう丁寧に解説します。
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Clock className="h-4 w-4 text-[#999]" />
            <p className="text-sm text-[#999]">所要時間：約15〜20分</p>
          </div>
        </div>

        {/* What is Stripe */}
        <div className="rounded-2xl bg-white border border-[#E5E5E5] p-6 mb-10">
          <h2
            className="text-base font-bold text-[#1A1A1A] mb-4"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            Stripeとは？
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-[#635BFF] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">世界中で信頼されている決済サービス</p>
                <p className="text-xs text-[#999] mt-0.5">
                  Amazon、Google、Shopifyなど数百万の企業が利用。PCI DSS Level 1準拠の最高レベルのセキュリティで、カード情報はStripeが安全に管理します。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="h-4 w-4 text-[#635BFF] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">初期費用・月額費用なし</p>
                <p className="text-xs text-[#999] mt-0.5">
                  決済が発生したときのみ手数料がかかります（日本: 3.6%）。月額費用やセットアップ費用は一切ありません。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#635BFF] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">返金も簡単</p>
                <p className="text-xs text-[#999] mt-0.5">
                  Stripeダッシュボードからワンクリックで返金処理ができます。イベントキャンセル時も安心です。
                </p>
              </div>
            </div>
          </div>
          <InfoBox>
            参加者のカード情報はpetit event makerのサーバーを<strong>一切通りません</strong>。
            決済はStripeの安全な画面（Stripe Checkout）で行われるため、主催者も参加者も安心してご利用いただけます。
          </InfoBox>
        </div>

        {/* Auto-setup callout */}
        <div className="rounded-2xl bg-[#635BFF]/5 border-2 border-[#635BFF]/30 p-6 mb-10">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#635BFF] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">
                かんたん自動セットアップ
              </p>
              <p className="text-sm text-[#666] mt-1 leading-relaxed">
                <Link href="/settings/stripe" className="text-[#635BFF] underline underline-offset-2 hover:no-underline font-medium">Stripe決済設定ページ</Link>でシークレットキーを貼り付けるだけで、Webhook設定を含めすべて自動で連携されます。
                以下はStripeアカウントの作成とキー取得の手順です。
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-12">
          {/* ─── Step 1: Account creation ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={1} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  Stripeアカウントを作成
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  まず
                  <a
                    href="https://dashboard.stripe.com/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#635BFF] underline underline-offset-2 hover:no-underline inline-flex items-center gap-1"
                  >
                    Stripe登録ページ
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  にアクセスします。メールアドレス、名前、パスワードを入力して「アカウントを作成」をクリックしてください。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  メールアドレスの確認後、ビジネス情報の入力画面が表示されます。
                  個人の方は「個人事業主」を選択し、必要事項を入力してください。
                  <strong className="text-[#1A1A1A]">本番の決済を開始するまで</strong>は、ビジネス情報の入力を後回しにしてもテストモードで利用できます。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <Step1Mockup />
              <TipBox>
                既にStripeアカウントをお持ちの場合は、このステップをスキップして
                <a
                  href="https://dashboard.stripe.com/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#635BFF] underline underline-offset-2 hover:no-underline"
                >
                  ダッシュボードにログイン
                </a>
                してください。
              </TipBox>
            </div>
          </section>

          {/* ─── Step 2: API keys ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={2} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  APIキーを取得
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  ダッシュボードにログインしたら、左サイドバーの一番下にある「
                  <strong className="text-[#1A1A1A]">開発者</strong>」をクリックし、「
                  <strong className="text-[#1A1A1A]">APIキー</strong>」タブを開きます。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  <strong className="text-[#FF8C00]">テストモードの切り替え方法:</strong>{" "}
                  左サイドバー下部の「開発者」の横にあるトグルスイッチをONにすると、テストモードに切り替わります。
                  テストモード中はヘッダーにオレンジ色の「テストモード」バッジが表示されます。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  2つのキーが表示されます:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[#666]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">公開可能キー</span>
                    <span><code className="bg-[#F2F2F2] px-1 rounded text-xs">pk_test_...</code> — フロントエンド用（公開OK）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">シークレットキー</span>
                    <span><code className="bg-[#F2F2F2] px-1 rounded text-xs">sk_test_...</code> — サーバー用（絶対に公開しない！）</span>
                  </li>
                </ul>
                <p className="text-sm text-[#666] mt-3 leading-relaxed">
                  シークレットキーが未作成の場合は「<strong className="text-[#1A1A1A]">＋ シークレットキーを作成</strong>」をクリックします。
                  キーの使用方法を選ぶダイアログが表示されたら、一番上の
                  「<strong className="text-[#635BFF]">構築した連携を強化</strong>」を選択してください。
                  これはアプリのコードからStripe APIを直接呼び出すための標準的な方法です。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <Step2Mockup />

              <div className="mt-4 rounded-xl bg-white border border-[#E5E5E5] p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  「secretキーを作成」の選択画面
                </p>
                <p className="text-sm text-[#666] mb-3">
                  キーの使用方法を聞かれたら、以下のように選択してください:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 bg-[#635BFF]/5 border border-[#635BFF]/30 rounded-lg px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-[#635BFF] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">構築した連携を強化</p>
                      <p className="text-xs text-[#666] mt-0.5">アプリのコードからStripe APIを呼び出す場合はこれを選択</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg px-4 py-3 opacity-50">
                    <div className="h-4 w-4 border border-[#D1D5DB] rounded mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-[#999]">サードパーティーのアプリケーションに提供する</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-[#F9FAFB] border border-[#E5E5E5] rounded-lg px-4 py-3 opacity-50">
                    <div className="h-4 w-4 border border-[#D1D5DB] rounded mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-[#999]">AIエージェントのオーソリ</p>
                    </div>
                  </div>
                </div>
              </div>

              <NoteBox>
                <strong>シークレットキー（sk_test_...）は絶対に公開しないでください。</strong>
                GitHubにコミットしたり、フロントエンドのコードに含めたりしてはいけません。
                環境変数として安全に管理します（ステップ4で設定）。
              </NoteBox>
            </div>
          </section>

          {/* ─── Step 3: Webhook (auto) ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={3} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  設定ページでキーを貼り付け
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  ステップ2で取得したシークレットキーを、
                  <Link href="/settings/stripe" className="text-[#635BFF] underline underline-offset-2 hover:no-underline font-medium">
                    Stripe決済設定ページ
                  </Link>
                  に貼り付けて「接続テスト＆保存」をクリックしてください。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  以下がすべて<strong className="text-[#1A1A1A]">自動で</strong>行われます:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[#666]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#635BFF] shrink-0 mt-0.5" />
                    <span>シークレットキーの検証</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#635BFF] shrink-0 mt-0.5" />
                    <span>Webhookエンドポイントの自動作成</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#635BFF] shrink-0 mt-0.5" />
                    <span>署名シークレットの自動取得・保存</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="ml-11">
              <TipBox>
                <strong>環境変数の手動設定やWebhookの手動作成は不要です。</strong>
                すべてシークレットキー1つの入力で自動化されています。
              </TipBox>
            </div>
          </section>

          {/* ─── Step 4: Test mode ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={4} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  テストモードで動作確認
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  環境変数を設定したら、テスト決済で動作を確認しましょう。
                  テストモードでは実際のお金は動きません。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <div className="rounded-xl bg-white border border-[#E5E5E5] p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TestTube className="h-3.5 w-3.5" />
                  テスト手順
                </p>
                <div className="space-y-3 text-sm text-[#666]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">1.</span>
                    <span>有料イベント（price &gt; 0）を作成する</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">2.</span>
                    <span>イベントページから申し込む → 「決済に進む」ボタンをクリック</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">3.</span>
                    <span>Stripe Checkoutの画面が表示される</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">4.</span>
                    <span>以下のテストカード番号を入力して決済する</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-[#635BFF]/5 border border-[#635BFF]/20 p-4">
                <p className="text-xs font-bold text-[#635BFF] mb-3">テスト用カード番号</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <code className="bg-white border border-[#E5E5E5] rounded px-3 py-1.5 text-sm font-mono text-[#1A1A1A] tracking-wider">
                      4242 4242 4242 4242
                    </code>
                    <span className="text-xs text-[#666]">成功するカード</span>
                  </div>
                  <div className="text-xs text-[#999] space-y-0.5">
                    <p>有効期限: 未来の日付なら何でもOK（例: 12/34）</p>
                    <p>CVC: 3桁の数字なら何でもOK（例: 123）</p>
                    <p>名前・郵便番号: 何でもOK</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white border border-[#E5E5E5] p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">確認ポイント</p>
                <div className="space-y-2 text-sm text-[#666]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>決済完了後、サンクスページに「決済＆お申し込み完了！」と表示される</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>参加者一覧に「支払済」バッジが表示される</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Stripeダッシュボードの「支払い」に決済が記録されている</span>
                  </div>
                </div>
              </div>

              <TipBox>
                <strong>テストモードの決済は何度でも無料で試せます。</strong>
                実際のカードは課金されないので、安心してテストしてください。
                Stripeダッシュボードの「支払い」で、テスト決済の履歴も確認できます。
              </TipBox>
            </div>
          </section>

          {/* ─── Step 5: Go live ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={5} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  本番モードに切り替え
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  テストが成功したら、本番モードに切り替えて実際の決済を開始できます。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <div className="rounded-xl bg-white border border-[#E5E5E5] p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Rocket className="h-3.5 w-3.5" />
                  本番切り替え手順
                </p>
                <div className="space-y-3 text-sm text-[#666]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">1.</span>
                    <span>
                      Stripeダッシュボードでビジネス情報の入力を完了する
                      （テストモードでスキップした場合）
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">2.</span>
                    <span>
                      左サイドバー下部の「開発者」横のテストモードトグルをOFF（本番モード）に切り替える
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">3.</span>
                    <span>
                      「開発者」→「APIキー」で<strong>本番用のシークレットキー</strong>を取得
                      （<code className="bg-[#F2F2F2] px-1 rounded text-xs">sk_live_...</code>）
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">4.</span>
                    <span>
                      <Link href="/settings/stripe" className="text-[#635BFF] underline underline-offset-2 hover:no-underline">Stripe決済設定ページ</Link>で一度連携を解除し、本番キーで再連携する
                    </span>
                  </div>
                </div>
              </div>

              <TipBox>
                本番キー（<code className="bg-white/80 px-1 rounded text-xs">sk_live_...</code>）で再連携すると、
                本番用のWebhookも自動作成されます。環境変数の手動変更や再デプロイは不要です。
              </TipBox>
            </div>
          </section>

          {/* ─── Step 6: Refunds ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={6} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  返金について
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  イベントキャンセルや参加者都合での返金は、Stripeダッシュボードから簡単に行えます。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <div className="rounded-xl bg-white border border-[#E5E5E5] p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">返金手順</p>
                <div className="space-y-3 text-sm text-[#666]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">1.</span>
                    <span>
                      <a
                        href="https://dashboard.stripe.com/payments"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#635BFF] underline underline-offset-2 hover:no-underline"
                      >
                        Stripeダッシュボード → 支払い
                      </a>
                      を開く
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">2.</span>
                    <span>返金したい支払いをクリック</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">3.</span>
                    <span>「返金」ボタンをクリック → 全額または一部返金を選択</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#635BFF] font-bold shrink-0">4.</span>
                    <span>返金理由を選択して確認 → 完了</span>
                  </div>
                </div>
              </div>

              <InfoBox>
                返金はStripeの手数料分を含めて全額返金されます（手数料は主催者負担）。
                返金後、参加者のカードに5〜10営業日で返金額が戻ります。
              </InfoBox>
            </div>
          </section>

          {/* ─── Completion ─── */}
          <div className="rounded-2xl bg-[#635BFF]/5 border-2 border-[#635BFF]/30 p-6 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h2
              className="text-lg font-bold text-[#635BFF] mb-2"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              セットアップ完了！
            </h2>
            <p className="text-sm text-[#666] leading-relaxed">
              おつかれさまでした！これで有料イベントの決済を受け付けられるようになりました。
              <br />
              イベント作成時に「参加費」を1円以上に設定すると、自動的にStripe決済が有効になります。
            </p>
            <div className="mt-4 rounded-xl bg-white/80 border border-[#635BFF]/10 px-4 py-3 text-left">
              <p className="text-xs font-bold text-[#635BFF] mb-2">連携後にできること</p>
              <div className="space-y-1.5 text-sm text-[#666]">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#635BFF] mt-0.5 shrink-0" />
                  <span>有料イベントの申込時に、Stripeの安全な決済画面で支払いを受付</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#635BFF] mt-0.5 shrink-0" />
                  <span>参加者一覧で支払いステータスを一覧確認</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#635BFF] mt-0.5 shrink-0" />
                  <span>Stripeダッシュボードから返金や売上確認</span>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 mt-4 bg-[#635BFF] text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#5851db] transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              ダッシュボードへ
            </Link>
          </div>

          {/* ─── FAQ ─── */}
          <section className="space-y-4">
            <h2
              className="text-lg font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              よくある質問
            </h2>
            <div className="space-y-2">
              <FAQItem q="Stripeの手数料はいくらですか？">
                <p>
                  日本のカード決済の場合、<strong>3.6%</strong>の手数料がかかります。
                  例えば1,000円のイベントなら36円が手数料として差し引かれ、964円が入金されます。
                </p>
                <p className="mt-2">
                  初期費用・月額費用は一切ありません。決済が発生したときのみ手数料がかかります。
                </p>
              </FAQItem>

              <FAQItem q="入金サイクルはどうなっていますか？">
                <p>
                  日本では<strong>週1回</strong>、登録した銀行口座に自動で振り込まれます。
                  Stripeダッシュボードの「残高」で、次回の入金予定額と日程を確認できます。
                </p>
                <p className="mt-2">
                  初回の入金には、アカウント作成から7〜14日ほどかかる場合があります。
                </p>
              </FAQItem>

              <FAQItem q="テストモードと本番モードの違いは？">
                <p>
                  <strong>テストモード:</strong> 実際のお金は動きません。テスト用カード番号（4242...）で決済のテストができます。
                  APIキーは <code className="bg-[#F2F2F2] px-1 rounded text-xs">sk_test_...</code> で始まります。
                </p>
                <p className="mt-2">
                  <strong>本番モード:</strong> 実際のクレジットカードで決済が行われます。
                  APIキーは <code className="bg-[#F2F2F2] px-1 rounded text-xs">sk_live_...</code> で始まります。
                </p>
                <p className="mt-2 text-xs text-[#999]">
                  テストモードの決済データは本番モードには表示されず、逆も同様です。完全に分離されています。
                </p>
              </FAQItem>

              <FAQItem q="無料イベントへの影響はありますか？">
                <p>
                  <strong>一切ありません。</strong>
                  Stripeが連携されていない場合、またはイベントの参加費が0円の場合は、
                  これまでと同じ無料の申込フローが使われます。
                </p>
              </FAQItem>

              <FAQItem q="参加者のカード情報は安全ですか？">
                <p>
                  <strong>はい、安全です。</strong>
                  カード情報はStripeの安全な決済画面（Stripe Checkout）で入力され、
                  petit event makerのサーバーには一切保存されません。
                </p>
                <p className="mt-2">
                  StripeはPCI DSS Level 1認定（最高レベル）を取得しており、
                  カード情報の取り扱いにおいて業界最高水準のセキュリティを提供しています。
                </p>
              </FAQItem>

              <FAQItem q="決済ページが表示されない / エラーが出る">
                <p className="mb-2">以下を順に確認してください:</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>
                    <strong>Stripe連携が完了しているか</strong> —
                    <Link href="/settings/stripe" className="text-[#635BFF] underline underline-offset-2 hover:no-underline">Stripe決済設定ページ</Link>で「接続済み」になっているか確認。
                  </li>
                  <li>
                    <strong>イベントの参加費が0円になっていないか</strong> —
                    参加費が0円のイベントではStripe決済は有効になりません。
                  </li>
                </ul>
              </FAQItem>

              <FAQItem q="Webhook が動作しない / 支払済バッジが表示されない">
                <p className="mb-2">Webhookは連携時に自動設定されますが、問題がある場合は以下を確認してください:</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>
                    <strong>Stripe連携を一度解除して再連携する</strong> —
                    <Link href="/settings/stripe" className="text-[#635BFF] underline underline-offset-2 hover:no-underline">設定ページ</Link>で解除→再連携すると、Webhookが再作成されます。
                  </li>
                  <li>
                    <strong>Stripeダッシュボードの「ワークベンチ」→「Webhook」</strong>で、
                    送信されたイベントとレスポンスステータスを確認できます。
                  </li>
                </ul>
              </FAQItem>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#E5E5E5] py-6 text-center text-xs text-[#999999] hidden sm:block">
        <p>&copy; 2026 プチイベント作成くん</p>
      </footer>
    </div>
  );
}
