import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  ChevronDown,
  Lightbulb,
  CheckCircle2,
  Smartphone,
  Info,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/header";
import { VideoEmbed } from "@/components/video-embed";

// ─── CSS Mockup building blocks ──────────────────────────────

function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#D1D5DB] shadow-lg overflow-hidden bg-white">
      {/* Title bar */}
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
      {/* Content */}
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
      <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#06C755] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
        {label}
      </span>
      <div className="ring-2 ring-[#06C755] ring-offset-2 rounded-md">
        {children}
      </div>
    </div>
  );
}

function Sidebar({
  items,
  activeIndex,
}: {
  items: string[];
  activeIndex: number;
}) {
  return (
    <div className="w-36 sm:w-44 bg-[#1A1A1A] text-white p-3 space-y-1 shrink-0">
      <div className="text-[10px] text-[#666] uppercase tracking-wider mb-2 px-2">
        Menu
      </div>
      {items.map((item, i) => (
        <div
          key={item}
          className={`text-[11px] px-2 py-1.5 rounded-md truncate ${
            i === activeIndex
              ? "bg-[#06C755] text-white font-medium"
              : "text-[#999] opacity-60"
          }`}
        >
          {item}
        </div>
      ))}
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
    <div className="flex gap-3 rounded-xl bg-[#06C755]/5 border border-[#06C755]/20 px-4 py-3 mt-4">
      <Lightbulb className="h-4 w-4 text-[#06C755] shrink-0 mt-0.5" />
      <div className="text-sm text-[#4a7c59] leading-relaxed">{children}</div>
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-white text-sm font-bold">
      {n}
    </div>
  );
}

// ─── Step mockups ────────────────────────────────────────────

function Step1Mockup() {
  return (
    <BrowserFrame url="developers.line.biz/console/">
      <div className="p-4 sm:p-6 space-y-4 bg-[#FAFAFA] min-h-[180px]">
        <div className="text-xs text-[#999] mb-2">プロバイダー</div>
        <div className="space-y-2">
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3 text-sm text-[#666] opacity-40">
            既存のプロバイダー...
          </div>
        </div>
        <div className="pt-2">
          <Highlight label="ここをクリック">
            <button className="bg-[#06C755] text-white text-sm font-medium px-4 py-2 rounded-lg w-full text-center">
              + 新規プロバイダー作成
            </button>
          </Highlight>
        </div>
        <div className="text-[11px] text-[#999] mt-2">
          プロバイダー名 = あなたのサービス名（公開されます）
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step2Mockup() {
  return (
    <BrowserFrame url="developers.line.biz/console/channel/new">
      <div className="p-4 sm:p-6 bg-[#FAFAFA] min-h-[180px]">
        <div className="text-xs text-[#999] mb-3">
          チャネルの種類を選択してください
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 opacity-40">
            <div className="text-sm font-medium text-[#1A1A1A] mb-1">
              LINE Login
            </div>
            <div className="text-[11px] text-[#999]">
              Webアプリにログイン機能を追加
            </div>
          </div>
          <Highlight label="こちらを選択">
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-4">
              <div className="text-sm font-medium text-[#1A1A1A] mb-1">
                Messaging API
              </div>
              <div className="text-[11px] text-[#999]">
                ボットでメッセージを送受信
              </div>
            </div>
          </Highlight>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step2FormMockup() {
  return (
    <BrowserFrame url="developers.line.biz/console/channel/new/messaging-api">
      <div className="p-4 sm:p-6 bg-[#FAFAFA] space-y-3">
        <div className="text-sm font-medium text-[#1A1A1A] mb-2">チャネル作成</div>
        <div className="space-y-3">
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5">
            <div className="text-[11px] text-[#999]">チャネルの種類</div>
            <div className="text-xs text-[#666] mt-1">Messaging API</div>
          </div>
          <Highlight label="イベント参加者に見える名前">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5">
              <div className="text-[11px] text-[#999]">チャネル名 <span className="text-red-400">*</span></div>
              <div className="bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#999] mt-1">
                例: ○○教室 イベント通知
              </div>
            </div>
          </Highlight>
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5">
            <div className="text-[11px] text-[#999]">チャネル説明 <span className="text-red-400">*</span></div>
            <div className="bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#999] mt-1">
              例: イベントの案内や予約通知をお届けします
            </div>
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5 opacity-40">
            <div className="text-[11px] text-[#999]">大業種 <span className="text-red-400">*</span></div>
            <div className="text-xs text-[#666] mt-1">個人 / その他 など</div>
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5 opacity-40">
            <div className="text-[11px] text-[#999]">小業種 <span className="text-red-400">*</span></div>
            <div className="text-xs text-[#666] mt-1">その他 など</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#999]">
            <div className="w-4 h-4 border-2 border-[#06C755] rounded bg-[#06C755]/20 flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-[#06C755]" />
            </div>
            LINE公式アカウント利用規約に同意
          </div>
          <div className="bg-[#06C755] text-white text-sm font-medium px-4 py-2 rounded-lg text-center">
            作成
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step3Mockup() {
  const sidebarItems = [
    "チャネル基本設定",
    "Messaging API設定",
    "統計情報",
    "権限管理",
  ];
  return (
    <BrowserFrame url="developers.line.biz/console/channel/xxxx/messaging-api">
      <div className="flex min-h-[220px]">
        <Sidebar items={sidebarItems} activeIndex={1} />
        <div className="flex-1 p-4 sm:p-6 bg-[#FAFAFA] space-y-4">
          <div className="text-sm font-medium text-[#1A1A1A]">
            Messaging API設定
          </div>
          <div className="space-y-3 opacity-40">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5">
              <div className="text-[11px] text-[#999]">Bot情報</div>
              <div className="text-xs text-[#666] mt-1">Bot ID: @xxx...</div>
            </div>
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5">
              <div className="text-[11px] text-[#999]">Webhook URL</div>
              <div className="text-xs text-[#666] mt-1">未設定</div>
            </div>
          </div>
          <div className="text-[11px] text-[#999] flex items-center gap-1">
            <ChevronDown className="h-3 w-3" />
            ページ最下部までスクロール
          </div>
          <Highlight label="「発行」をクリック">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
              <div className="text-[11px] text-[#999]">
                チャネルアクセストークン（長期）
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#999] truncate">
                  まだ発行されていません
                </div>
                <div className="bg-[#06C755] text-white text-[11px] font-medium px-3 py-1 rounded">
                  発行
                </div>
              </div>
            </div>
          </Highlight>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step3AfterMockup() {
  return (
    <BrowserFrame url="developers.line.biz/console/channel/xxxx/messaging-api">
      <div className="p-4 sm:p-6 bg-[#FAFAFA]">
        <Highlight label="全体を選択してコピー">
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
            <div className="text-[11px] text-[#999]">
              チャネルアクセストークン（長期）
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#666] break-all leading-relaxed">
                eyJhbGciOiJIUzI1NiJ9.xxxxxxxxxxxxxxxx
                xxxxxxxxxxxxxxxxxxxxxxxxxxx...（続く）
              </div>
              <div className="bg-[#F2F2F2] text-[#666] text-[11px] px-2 py-1 rounded shrink-0">
                コピー
              </div>
            </div>
          </div>
        </Highlight>
      </div>
    </BrowserFrame>
  );
}

function Step4Mockup() {
  const sidebarItems = [
    "チャネル基本設定",
    "Messaging API設定",
    "統計情報",
    "権限管理",
  ];
  return (
    <BrowserFrame url="developers.line.biz/console/channel/xxxx/basic">
      <div className="flex min-h-[200px]">
        <Sidebar items={sidebarItems} activeIndex={0} />
        <div className="flex-1 p-4 sm:p-6 bg-[#FAFAFA] space-y-4">
          <div className="text-sm font-medium text-[#1A1A1A]">
            チャネル基本設定
          </div>
          <div className="space-y-3">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5 opacity-40">
              <div className="text-[11px] text-[#999]">チャネルID</div>
              <div className="text-xs text-[#666] mt-1">1234567890</div>
            </div>
            <Highlight label="これをコピー">
              <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
                <div className="text-[11px] text-[#999]">
                  チャネルシークレット
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#666] truncate">
                    a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
                  </div>
                  <div className="bg-[#F2F2F2] text-[#666] text-[11px] px-2 py-1 rounded">
                    コピー
                  </div>
                </div>
              </div>
            </Highlight>
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5 opacity-40">
              <div className="text-[11px] text-[#999]">アサーション署名キー</div>
              <div className="text-xs text-[#666] mt-1">...</div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step5Mockup() {
  return (
    <BrowserFrame url="petit-event-maker-am.vercel.app/settings/line">
      <div className="p-4 sm:p-6 bg-[#FAFAFA] min-h-[200px] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C755]/10">
            <MessageSquare className="h-4 w-4 text-[#06C755]" />
          </div>
          <div className="text-sm font-medium text-[#1A1A1A]">
            LINE公式アカウントを連携
          </div>
        </div>
        <Highlight label="ステップ3のトークンを貼り付け">
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5">
            <div className="text-[11px] text-[#999] mb-1">
              チャネルアクセストークン
            </div>
            <div className="bg-[#F2F2F2] rounded px-2 py-1.5 text-[10px] font-mono text-[#999]">
              ここに貼り付け...
            </div>
          </div>
        </Highlight>
        <div className="mt-3">
          <Highlight label="ステップ4のシークレットを貼り付け">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-2.5">
              <div className="text-[11px] text-[#999] mb-1">
                チャネルシークレット
              </div>
              <div className="bg-[#F2F2F2] rounded px-2 py-1.5 text-[10px] font-mono text-[#999]">
                ここに貼り付け...
              </div>
            </div>
          </Highlight>
        </div>
        <div className="pt-2">
          <div className="bg-[#06C755] text-white text-sm font-medium px-4 py-2 rounded-full text-center w-fit">
            接続テスト＆保存
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step6Mockup() {
  const sidebarItems = [
    "チャネル基本設定",
    "Messaging API設定",
    "統計情報",
    "権限管理",
  ];
  return (
    <BrowserFrame url="developers.line.biz/console/channel/xxxx/messaging-api">
      <div className="flex min-h-[280px]">
        <Sidebar items={sidebarItems} activeIndex={1} />
        <div className="flex-1 p-4 sm:p-6 bg-[#FAFAFA] space-y-4">
          <div className="text-sm font-medium text-[#1A1A1A]">
            Messaging API設定
          </div>
          <Highlight label="接続後に表示されるURLを貼り付け">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
              <div className="text-[11px] text-[#999]">Webhook URL</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-[#F2F2F2] rounded px-2 py-1 text-[10px] font-mono text-[#666] truncate">
                  https://your-app.vercel.app/api/line/webhook
                </div>
                <div className="bg-[#06C755] text-white text-[11px] px-2 py-1 rounded">
                  更新
                </div>
              </div>
            </div>
          </Highlight>
          <div className="mt-4">
            <Highlight label="必ずONにする！">
              <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#999]">
                      Webhookの利用
                    </div>
                    <div className="text-[10px] text-[#999] mt-0.5">
                      Webhookイベントの送信を有効にします
                    </div>
                  </div>
                  {/* Toggle switch mockup */}
                  <div className="w-10 h-5 bg-[#06C755] rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </div>
              </div>
            </Highlight>
          </div>
          <div className="mt-3 opacity-60">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[#999]">検証</div>
                <div className="bg-[#F2F2F2] text-[#666] text-[11px] px-3 py-1 rounded">
                  検証
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step6ResponseSettingsMockup() {
  return (
    <BrowserFrame url="manager.line.biz/account/@xxx/setting/response">
      <div className="p-4 sm:p-6 bg-[#FAFAFA] space-y-3">
        <div className="text-sm font-medium text-[#1A1A1A] mb-2">応答設定</div>
        <Highlight label="「無効」に変更">
          <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-[#1A1A1A] font-medium">応答メッセージ</div>
                <div className="text-[10px] text-[#999] mt-0.5">ユーザーからのメッセージに自動で応答します</div>
              </div>
              {/* Toggle switch mockup - OFF state */}
              <div className="w-10 h-5 bg-[#D1D5DB] rounded-full relative">
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          </div>
        </Highlight>
        <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3 opacity-40">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-[#1A1A1A] font-medium">あいさつメッセージ</div>
              <div className="text-[10px] text-[#999] mt-0.5">友だち追加時に自動で送信します</div>
            </div>
            <div className="w-10 h-5 bg-[#06C755] rounded-full relative">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step7QRMockup() {
  const sidebarItems = [
    "チャネル基本設定",
    "Messaging API設定",
    "統計情報",
    "権限管理",
  ];
  return (
    <BrowserFrame url="developers.line.biz/console/channel/xxxx/messaging-api">
      <div className="flex min-h-[200px]">
        <Sidebar items={sidebarItems} activeIndex={1} />
        <div className="flex-1 p-4 sm:p-6 bg-[#FAFAFA] space-y-4">
          <div className="text-sm font-medium text-[#1A1A1A]">
            Messaging API設定
          </div>
          <Highlight label="スマホで読み取り">
            <div className="bg-white border border-[#E5E5E5] rounded-lg px-4 py-3">
              <div className="text-[11px] text-[#999] mb-2">QRコード</div>
              <div className="flex items-center gap-4">
                {/* QR code mockup */}
                <div className="w-20 h-20 bg-[#F2F2F2] rounded-lg border-2 border-dashed border-[#D1D5DB] flex items-center justify-center shrink-0">
                  <div className="grid grid-cols-5 gap-0.5">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-[1px] ${
                          [0,1,2,4,5,6,10,12,14,18,20,22,23,24].includes(i)
                            ? "bg-[#1A1A1A]"
                            : "bg-white"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-[#666] leading-relaxed">
                  <div className="font-medium text-[#1A1A1A] mb-1">Bot ID: @xxxx</div>
                  このQRコードをLINEアプリで読み取ると友だち追加できます
                </div>
              </div>
            </div>
          </Highlight>
        </div>
      </div>
    </BrowserFrame>
  );
}

function Step7FollowerMockup() {
  return (
    <BrowserFrame url="petit-event-maker-am.vercel.app/settings/line">
      <div className="p-4 sm:p-6 bg-[#FAFAFA] min-h-[200px] space-y-4">
        <div className="text-xs text-[#999] uppercase tracking-wider mb-2">
          フォロワー一覧
        </div>
        <div className="flex items-center gap-3 bg-white border border-[#E5E5E5] rounded-xl px-3 py-2.5">
          <div className="h-9 w-9 rounded-full bg-[#06C755]/20 flex items-center justify-center shrink-0">
            <span className="text-sm">👤</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#1A1A1A]">
              あなたの LINE 名
            </div>
            <div className="text-[11px] text-[#999]">
              2026/04/17 フォロー
            </div>
          </div>
          <Highlight label="クリックで通知先に設定">
            <div className="bg-white border border-[#E5E5E5] text-[11px] font-medium px-3 py-1.5 rounded-full text-[#1A1A1A]">
              通知先に設定
            </div>
          </Highlight>
        </div>
        <div className="rounded-lg bg-[#F2F2F2] px-3 py-2 text-[11px] text-[#666]">
          通知先に設定すると、予約通知が 1:1のDM で届きます
        </div>
      </div>
    </BrowserFrame>
  );
}

// ─── FAQ Section ─────────────────────────────────────────────

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

// ─── Main page ───────────────────────────────────────────────

export default function LineSetupGuidePage() {
  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        {/* Back link */}
        <Link
          href="/settings/line"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          LINE連携設定へ戻る
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755]/10">
              <MessageSquare className="h-5 w-5 text-[#06C755]" />
            </div>
            <h1
              className="text-2xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              LINE公式アカウント 連携ガイド
            </h1>
          </div>
          <p className="mt-3 text-sm text-[#666] leading-relaxed">
            LINE公式アカウントと連携すると、イベントを公開した際にフォロワーへ画像付きのリッチカードで自動通知でき、新しい予約が入った際にDMで通知を受け取ることもできます。
            このガイドでは、初めての方でも迷わず設定できるよう、画面のどこを操作すればよいかを丁寧に解説します。
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Clock className="h-4 w-4 text-[#999]" />
            <p className="text-sm text-[#999]">所要時間：約10〜15分</p>
          </div>
        </div>

        {/* Wizard CTA */}
        <Link
          href="/settings/line/wizard"
          className="block mb-8 rounded-2xl border-2 border-[#06C755]/30 bg-[#06C755]/5 hover:bg-[#06C755]/10 transition-colors p-5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#06C755] text-white shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-[#1A1A1A]">
                かんたんウィザードで進める（推奨）
              </h2>
              <p className="text-xs text-[#666] mt-1 leading-relaxed">
                4ステップに分けて1問ずつ案内します。各画面で貼り付けるだけで自動検証＆セットアップが完了。
              </p>
            </div>
            <ChevronLeft className="h-4 w-4 text-[#06C755] rotate-180 shrink-0 mt-2.5" />
          </div>
        </Link>

        {/* 重要: Messaging APIはDevelopers Consoleでのみ設定可能の注意書き */}
        <div className="mb-8 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-bold text-amber-900">
                Messaging APIの設定は <span className="underline">LINE Developers Console</span> から行います
              </p>
              <p className="text-xs text-amber-900/80 leading-relaxed">
                LINEのサービス画面は2つあります。間違えやすいので注意してください:
              </p>
              <div className="space-y-1.5 text-xs text-amber-900/80">
                <p>
                  ✅ <strong className="text-amber-900">LINE Developers Console</strong>（<code className="font-mono text-[10px] bg-white/60 px-1 py-0.5 rounded">developers.line.biz</code>）
                  — チャネル作成・トークン発行・シークレット取得・Webhook URL設定 など
                </p>
                <p>
                  ⚪️ <strong>LINE Official Account Manager</strong>（<code className="font-mono text-[10px] bg-white/60 px-1 py-0.5 rounded">manager.line.biz</code>）
                  — 応答メッセージOFF・あいさつメッセージ・配信 など
                </p>
              </div>
              <p className="text-xs text-amber-900/80 leading-relaxed pt-1">
                Messaging API のトークン・シークレット・Webhookは <strong className="text-amber-900">必ず Developers Console</strong> から取得・設定してください。
                Official Account Manager 側にはこれらの項目はありません。
              </p>
            </div>
          </div>
        </div>

        {/* Video walkthrough */}
        <VideoEmbed
          title="LINE連携ガイド動画"
          className="rounded-2xl overflow-hidden border border-[#E5E5E5] bg-black aspect-video mb-8"
        />

        {/* Prerequisites */}
        <div className="rounded-2xl bg-white border border-[#E5E5E5] p-6 mb-10">
          <h2
            className="text-base font-bold text-[#1A1A1A] mb-4"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            始める前に用意するもの
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">LINEアカウント</p>
                <p className="text-xs text-[#999] mt-0.5">
                  普段お使いのLINEアカウントでOKです。新しくアカウントを作る必要はありません。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">パソコンのブラウザ</p>
                <p className="text-xs text-[#999] mt-0.5">
                  LINE Developersコンソールでの操作はパソコンで行います。Chrome, Safari, Firefoxなど。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Smartphone className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">スマートフォン（ステップ7で使用）</p>
                <p className="text-xs text-[#999] mt-0.5">
                  QRコードを読み取って公式アカウントを友だち追加するために必要です。
                </p>
              </div>
            </div>
          </div>
          <InfoBox>
            LINE公式アカウントは<strong>無料プラン（コミュニケーションプラン）</strong>で利用できます。月200通まで無料でメッセージを送れるので、小〜中規模のイベントには十分です。クレジットカードの登録も不要です。
          </InfoBox>
        </div>

        {/* Steps */}
        <div className="space-y-12">
          {/* ─── Step 1 ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={1} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  LINE Developersにログイン
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  まず
                  <a
                    href="https://developers.line.biz/console/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#06C755] underline underline-offset-2 hover:no-underline inline-flex items-center gap-1"
                  >
                    LINE Developersコンソール
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  にアクセスします。「LINEアカウントでログイン」ボタンが表示されるので、お使いのLINEアカウント（メールアドレスとパスワード、またはQRコードログイン）でログインしてください。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  初めてアクセスする場合は、開発者情報の登録画面が表示されます。お名前とメールアドレスを入力して登録してください。
                  その後、「<strong className="text-[#1A1A1A]">プロバイダー</strong>」を作成する画面が表示されます。
                  プロバイダーとは、LINEのサービスを管理するための「組織」のようなもので、この中にチャネル（Bot）を作成していきます。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <Step1Mockup />
              <NoteBox>
                <strong>プロバイダー名は友だち追加時にユーザーに表示されます。</strong>
                サービス名や教室名、団体名などがおすすめです。個人名を入れると友だち追加をためらわれる場合があるので避けましょう。
                （例: 「○○料理教室」「△△コミュニティ」）
              </NoteBox>
              <TipBox>
                既にLINE Developersアカウントをお持ちで、別のプロバイダーが表示されている場合は、既存のプロバイダーを選択してその中にチャネルを追加することもできます。
              </TipBox>
            </div>
          </section>

          {/* ─── Step 2 ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={2} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  Messaging APIチャネルを作成
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  プロバイダーの画面で「<strong className="text-[#1A1A1A]">新規チャネル作成</strong>」をクリックします。
                  チャネルの種類を選ぶ画面が表示されるので、
                  <strong className="text-[#1A1A1A]">「Messaging API」</strong>
                  を選択してください。これがイベント通知に使うBotの本体になります。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <Step2Mockup />
              <NoteBox>
                <strong>「LINE Login」と間違えやすいので注意！</strong>
                「LINE Login」はWebサイトにLINEログインボタンを追加するためのもので、メッセージ送信はできません。
                必ず<strong>「Messaging API」</strong>を選んでください。
              </NoteBox>

              <div className="mt-6 space-y-3">
                <p className="text-sm text-[#666] leading-relaxed">
                  「Messaging API」を選択すると、チャネルの詳細を入力するフォームが表示されます。以下の項目を入力してください:
                </p>
                <Step2FormMockup />
                <div className="rounded-xl bg-white border border-[#E5E5E5] p-4 mt-4">
                  <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">入力項目の説明</p>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex gap-2">
                      <span className="text-[#06C755] font-bold shrink-0">チャネル名</span>
                      <span className="text-[#666]">
                        LINEの友だちリストに表示される名前です。「○○教室 イベント通知」のようにわかりやすい名前がおすすめです。
                        <span className="text-[#999]">（後から変更可能。ただし変更は7日に1回まで）</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[#06C755] font-bold shrink-0">チャネル説明</span>
                      <span className="text-[#666]">
                        「イベントの案内や予約通知をお届けします」など、何のBotかわかる説明を入力します。
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[#06C755] font-bold shrink-0">大業種・小業種</span>
                      <span className="text-[#666]">
                        最も近いものを選べばOKです。迷ったら「個人」→「その他」で問題ありません。
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <TipBox>
                チャネルアイコン（プロフィール画像）はこの画面では設定しませんが、あとから
                <a
                  href="https://manager.line.biz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#06C755] underline underline-offset-2 hover:no-underline"
                >
                  LINE Official Account Manager
                </a>
                で変更できます。アイコンがあると友だち追加してもらいやすくなります。
              </TipBox>
            </div>
          </section>

          {/* ─── Step 3 ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={3} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  チャネルアクセストークンを取得
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  チャネルを作成したら、そのチャネルの設定ページが表示されます。
                  左側メニューの「<strong className="text-[#1A1A1A]">Messaging API設定</strong>」タブをクリックしてください。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  ページを<strong className="text-[#1A1A1A]">一番下までスクロール</strong>すると、
                  「チャネルアクセストークン（長期）」というセクションがあります。
                  「<strong className="text-[#1A1A1A]">発行</strong>」ボタンをクリックすると、トークン（長い文字列）が生成されます。
                  このトークンは、アプリがLINE Botとしてメッセージを送るための「認証キー」です。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <Step3Mockup />

              <p className="text-sm text-[#666] mt-6 mb-3 leading-relaxed">
                「発行」をクリックすると、下のようにトークンが表示されます。「コピー」ボタンで全文をコピーしてください:
              </p>
              <Step3AfterMockup />

              <NoteBox>
                <strong>トークンは非常に長い文字列（約170文字）です。</strong>
                手動で選択すると途中で切れてしまうことがあるので、必ず「コピー」ボタンを使ってください。
                メモ帳やテキストエディタに一時的に貼り付けておくと安心です。
              </NoteBox>
              <TipBox>
                トークンを紛失してしまった場合は、同じ画面で「再発行」をクリックすれば新しいトークンを生成できます。
                ただし、古いトークンは無効になります。
              </TipBox>
            </div>
          </section>

          {/* ─── Step 4 ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={4} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  チャネルシークレットを取得
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  次に、同じチャネルの「<strong className="text-[#1A1A1A]">チャネル基本設定</strong>」タブに切り替えます。
                  ステップ3で開いていた「Messaging API設定」とは<strong className="text-[#1A1A1A]">別のタブ</strong>です。
                  左側メニューの一番上にあります。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  「チャネルシークレット」という欄があるので、その値をコピーします。
                  チャネルシークレットは、LINEから届くWebhookリクエストが本物かどうかを検証するための「署名鍵」です。
                  これがないと、友だち追加やブロック解除を自動検知できません。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <Step4Mockup />
              <NoteBox>
                <strong>タブの切り替え忘れが多いポイントです。</strong>
                左メニューで「<strong>チャネル基本設定</strong>」がハイライトされていることを確認してください。
                「Messaging API設定」のままだとシークレットは見つかりません。
              </NoteBox>
              <InfoBox>
                <strong>トークンとシークレットの違い:</strong><br />
                <span className="inline-block mt-1">
                  <strong>チャネルアクセストークン</strong> = 約170文字の長い文字列。メッセージ送信に使う。<br />
                  <strong>チャネルシークレット</strong> = 32文字の英数字。Webhook署名検証に使う。
                </span>
                <span className="block mt-1 text-xs">
                  それぞれ取得する場所（タブ）が異なるので注意してください。
                </span>
              </InfoBox>
            </div>
          </section>

          {/* ─── Step 5 ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={5} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  petit event makerで接続
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  ここからはpetit event makerの画面での操作です。
                  <Link
                    href="/settings/line"
                    className="text-[#06C755] underline underline-offset-2 hover:no-underline"
                  >
                    LINE連携設定ページ
                  </Link>
                  を開いてください。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  「LINE公式アカウントを連携」セクションに2つの入力欄があります。
                  ステップ3でコピーした<strong className="text-[#1A1A1A]">チャネルアクセストークン</strong>と、
                  ステップ4でコピーした<strong className="text-[#1A1A1A]">チャネルシークレット</strong>をそれぞれ貼り付けて、
                  「<strong className="text-[#1A1A1A]">接続テスト＆保存</strong>」ボタンをクリックします。
                </p>
              </div>
            </div>
            <div className="ml-11">
              <Step5Mockup />

              <div className="mt-6 rounded-xl bg-white border border-[#E5E5E5] p-4">
                <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">接続テスト後に起きること</p>
                <div className="space-y-2 text-sm text-[#666]">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
                    <span>入力されたトークンでLINE APIに接続テストを行います</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
                    <span>成功すると、Bot名が自動で取得されて画面に表示されます</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
                    <span>「接続済み」バッジが表示され、Webhook URLが表示されます（次のステップで使います）</span>
                  </div>
                </div>
              </div>

              <NoteBox>
                <strong>貼り付け時に前後にスペースや改行が入らないよう注意してください。</strong>
                特にスマートフォンのメモアプリからコピーすると余分な文字が入ることがあります。
                エラーが出た場合は、一度フォームをクリアして貼り直してみてください。
              </NoteBox>
              <TipBox>
                接続テストでエラーが出る場合は、このガイドの下部「よくあるトラブル」セクションを確認してください。
              </TipBox>
            </div>
          </section>

          {/* ─── Step 6 ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={6} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  Webhook URLを設定
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  接続が成功すると、petit event makerの画面に「<strong className="text-[#1A1A1A]">Webhook URL</strong>」が表示されます。
                  これはLINEからアプリにイベント（友だち追加、メッセージ受信など）を通知するためのURLです。
                  コピーボタンでURLをコピーしてください。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  LINE Developersコンソールに戻り、「<strong className="text-[#1A1A1A]">Messaging API設定</strong>」タブを開きます。
                  「Webhook URL」欄にコピーしたURLを貼り付けて「<strong className="text-[#1A1A1A]">更新</strong>」をクリックします。
                </p>
                <p className="text-sm text-[#666] mt-2 leading-relaxed">
                  さらに、そのすぐ下にある
                  <strong className="text-red-500">「Webhookの利用」スイッチを必ずON</strong>
                  にしてください。
                  <span className="text-red-500 font-medium">これを忘れると友だち追加が検知されず、フォロワーが表示されません。</span>
                </p>
              </div>
            </div>
            <div className="ml-11">
              <Step6Mockup />
              <NoteBox>
                <strong className="text-red-600">
                  最も多いミス: 「Webhookの利用」スイッチのON忘れ
                </strong>
                <br />
                Webhook URLを設定しただけでは、LINEからアプリにイベントが送信されません。
                URLの設定と「Webhookの利用」ONの<strong>2つの操作が必要</strong>です。
                画面のスイッチが緑色になっていることを必ず確認してください。
              </NoteBox>

              <div className="mt-6 space-y-3">
                <p className="text-sm text-[#666] leading-relaxed">
                  <strong className="text-[#1A1A1A]">Webhook URLの検証（任意）:</strong><br />
                  「更新」ボタンの下にある「検証」ボタンをクリックすると、LINEからアプリにテストリクエストが送信され、
                  正しく通信できるか確認できます。「成功」と表示されれば設定は正しいです。
                  エラーが出た場合は、URLが正しいか確認してください。
                </p>
              </div>

              <TipBox>
                <strong>応答メッセージの無効化もおすすめ:</strong><br />
                LINE公式アカウントには初期設定で「応答メッセージ」がONになっています。
                ユーザーがBotにメッセージを送ると「お問い合わせありがとうございます...」のような自動応答が返ります。
                不要な場合は
                <a
                  href="https://manager.line.biz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#06C755] underline underline-offset-2 hover:no-underline"
                >
                  LINE Official Account Manager
                </a>
                の「応答設定」で無効にできます。
              </TipBox>
              <div className="mt-4">
                <Step6ResponseSettingsMockup />
              </div>
            </div>
          </section>

          {/* ─── Step 7 ─── */}
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <StepBadge n={7} />
              <div>
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  友だち追加 &amp; 通知先設定
                </h2>
                <p className="text-sm text-[#666] mt-1 leading-relaxed">
                  最後のステップです。ここでは自分自身を公式アカウントの「友だち」として追加し、
                  予約通知の受け取り先として設定します。この操作はスマートフォンが必要です。
                </p>
              </div>
            </div>
            <div className="ml-11">
              {/* Sub-step A: QR code */}
              <div className="mb-6">
                <p className="text-sm font-medium text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F2F2F2] text-[10px] font-bold text-[#999]">A</span>
                  QRコードを見つける
                </p>
                <p className="text-sm text-[#666] mb-3 leading-relaxed">
                  LINE Developersコンソールの「Messaging API設定」タブを開くと、ページ上部に「QRコード」があります。
                  このQRコードをスマホのLINEアプリで読み取ります。
                </p>
                <Step7QRMockup />
              </div>

              {/* Sub-step B: Friend add */}
              <div className="mb-6">
                <p className="text-sm font-medium text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F2F2F2] text-[10px] font-bold text-[#999]">B</span>
                  LINEアプリで友だち追加
                </p>
                <div className="rounded-xl bg-white border border-[#E5E5E5] p-4 space-y-2 text-sm text-[#666]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#06C755] font-bold shrink-0">1.</span>
                    <span>スマホのLINEアプリを開く</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#06C755] font-bold shrink-0">2.</span>
                    <span>ホームタブ → 右上の「友だち追加」アイコン → 「QRコード」を選択</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#06C755] font-bold shrink-0">3.</span>
                    <span>パソコン画面のQRコードをスマホのカメラで読み取る</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#06C755] font-bold shrink-0">4.</span>
                    <span>表示された公式アカウントを「追加」する</span>
                  </div>
                </div>
                <TipBox>
                  友だち追加すると、Webhookを通じてアプリに通知が届き、自動的にフォロワー一覧に表示されます。
                  表示されるまで数秒かかることがありますので、ページをリロードしてみてください。
                </TipBox>
              </div>

              {/* Sub-step C: Set as owner */}
              <div className="mb-4">
                <p className="text-sm font-medium text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F2F2F2] text-[10px] font-bold text-[#999]">C</span>
                  通知先に設定する
                </p>
                <p className="text-sm text-[#666] mb-3 leading-relaxed">
                  petit event makerの
                  <Link
                    href="/settings/line"
                    className="text-[#06C755] underline underline-offset-2 hover:no-underline"
                  >
                    LINE連携設定ページ
                  </Link>
                  に戻ると、フォロワー一覧にあなたが表示されています。
                  「<strong className="text-[#1A1A1A]">通知先に設定</strong>」ボタンをクリックしてください。
                  これにより、予約通知がブロードキャスト（全員への一斉送信）ではなく、
                  あなた個人への<strong className="text-[#1A1A1A]">1:1のDM</strong>として届くようになります。
                </p>
                <Step7FollowerMockup />
              </div>

              <NoteBox>
                <strong>フォロワーが表示されない場合:</strong><br />
                <span className="inline-block mt-1">
                  1. Webhook URL が正しく設定されているか確認<br />
                  2. 「Webhookの利用」がONになっているか確認（最も多い原因）<br />
                  3. ページをリロード<br />
                  4. それでもダメな場合: LINEアプリで公式アカウントを一度ブロック → ブロック解除すると再検知されます
                </span>
              </NoteBox>
            </div>
          </section>

          {/* ─── Completion ─── */}
          <div className="rounded-2xl bg-[#06C755]/5 border-2 border-[#06C755]/30 p-6 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <h2
              className="text-lg font-bold text-[#06C755] mb-2"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              セットアップ完了！
            </h2>
            <p className="text-sm text-[#666] leading-relaxed">
              おつかれさまでした！これでイベント作成時にLINEフォロワーへ自動通知が送れるようになりました。
              <br />
              予約が入ったときのDM通知もON/OFFで切り替えられます。
            </p>
            <div className="mt-4 rounded-xl bg-white/80 border border-[#06C755]/10 px-4 py-3 text-left">
              <p className="text-xs font-bold text-[#06C755] mb-2">連携後にできること</p>
              <div className="space-y-1.5 text-sm text-[#666]">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#06C755] mt-0.5 shrink-0" />
                  <span>イベント公開時に、画像・日時・価格付きのリッチカードをフォロワーに自動送信</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#06C755] mt-0.5 shrink-0" />
                  <span>新しい予約が入ったとき、LINEのDMで通知を受信</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#06C755] mt-0.5 shrink-0" />
                  <span>通知のON/OFF切り替え、通知先の変更もいつでも可能</span>
                </div>
              </div>
            </div>
            <Link
              href="/settings/line"
              className="inline-flex items-center gap-2 mt-4 bg-[#06C755] text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#05b04c] transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              LINE連携設定ページへ
            </Link>
          </div>

          {/* ─── FAQ ─── */}
          <section className="space-y-4">
            <h2
              className="text-lg font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              よくあるトラブル
            </h2>
            <div className="space-y-2">
              <FAQItem q="接続テストでエラーが出る">
                <p className="mb-2">以下の項目を順に確認してください:</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>
                    <strong>トークンが正しくコピーされているか</strong> — 前後にスペースや改行が入っていないかチェックしましょう。
                    一度フォームをクリアして、再度LINE Developersからコピー＆ペーストしてみてください。
                  </li>
                  <li>
                    <strong>トークンが途中で切れていないか</strong> — チャネルアクセストークンは約170文字の非常に長い文字列です。
                    手動で選択するのではなく、必ずLINE Developers画面の「コピー」ボタンを使ってください。
                  </li>
                  <li>
                    <strong>正しいチャネルのトークンか</strong> — 「LINE Login」チャネルではなく「Messaging API」チャネルのトークンを使っているか確認してください。
                    LINE Developersでチャネルの種類が「Messaging API」と表示されていることを確認しましょう。
                  </li>
                  <li>
                    <strong>チャネルが公開状態か</strong> — チャネルの基本設定ページでステータスが「公開」になっていることを確認してください。
                    「開発中」のままだと動作しない場合があります。
                  </li>
                </ul>
              </FAQItem>

              <FAQItem q="フォロワーが表示されない">
                <p className="mb-2">友だち追加したのにフォロワー一覧に表示されない場合:</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>
                    <strong>最も多い原因: 「Webhookの利用」がOFFになっている</strong> — LINE Developersの「Messaging API設定」で、
                    「Webhookの利用」スイッチが緑色（ON）になっていることを確認してください。
                    URLだけ設定してスイッチをONにし忘れるケースが非常に多いです。
                  </li>
                  <li>
                    <strong>Webhook URLが正しく設定されているか</strong> — petit event makerに表示されているURLと完全に一致しているか確認してください。
                    末尾のスラッシュの有無にも注意してください。
                  </li>
                  <li>
                    <strong>ページをリロードしてみる</strong> — 友だち追加から表示まで数秒〜十数秒のタイムラグがある場合があります。
                  </li>
                  <li>
                    <strong>ブロック → ブロック解除</strong> — それでも表示されない場合は、LINEアプリで公式アカウントを一度ブロックし、
                    すぐにブロック解除してください。ブロック解除時にWebhookイベントが再送信され、フォロワーとして再検知されます。
                  </li>
                </ul>
              </FAQItem>

              <FAQItem q="通知が届かない">
                <p className="mb-2">イベントを公開したのにLINEに通知が届かない場合:</p>
                <ul className="list-disc pl-4 space-y-2">
                  <li>
                    <strong>「新規予約のLINE通知」がONか</strong> — LINE連携設定ページの「通知設定」セクションで
                    スイッチがONになっていることを確認してください。
                  </li>
                  <li>
                    <strong>通知先が設定されているか</strong> — フォロワー一覧で誰かが「通知先」に設定されていることを確認してください。
                    通知先が未設定の場合はブロードキャスト（全員への一斉送信）になりますが、
                    フォロワーが0人だと誰にも届きません。
                  </li>
                  <li>
                    <strong>LINE公式アカウントの無料メッセージ数の上限</strong> — 無料プランでは月200通までです。
                    上限に達するとその月はメッセージが送れなくなります。
                    <a
                      href="https://manager.line.biz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#06C755] underline underline-offset-2 hover:no-underline"
                    >
                      LINE Official Account Manager
                    </a>
                    で残り通数を確認できます。
                  </li>
                  <li>
                    <strong>LINEアプリの通知設定</strong> — スマホのLINEアプリ側で公式アカウントの通知をミュートにしていないか確認してください。
                  </li>
                </ul>
              </FAQItem>

              <FAQItem q="トークンとシークレットの見分け方">
                <p>2つは取得場所も見た目も異なります:</p>
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] px-4 py-3">
                    <p className="text-xs font-bold text-[#06C755] mb-1">チャネルアクセストークン（長期）</p>
                    <ul className="text-xs text-[#666] space-y-0.5">
                      <li>場所: 「<strong>Messaging API設定</strong>」タブの<strong>最下部</strong></li>
                      <li>取得方法: 「発行」ボタンをクリックして生成</li>
                      <li>長さ: <strong>約170文字</strong>の非常に長い文字列</li>
                      <li>見た目: <code className="bg-[#F2F2F2] px-1 rounded">eyJhbGciOiJIUzI1NiJ9.xxxxx...</code></li>
                    </ul>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] px-4 py-3">
                    <p className="text-xs font-bold text-[#06C755] mb-1">チャネルシークレット</p>
                    <ul className="text-xs text-[#666] space-y-0.5">
                      <li>場所: 「<strong>チャネル基本設定</strong>」タブ</li>
                      <li>取得方法: 最初から表示されている（発行不要）</li>
                      <li>長さ: <strong>32文字</strong>の英数字</li>
                      <li>見た目: <code className="bg-[#F2F2F2] px-1 rounded">a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6</code></li>
                    </ul>
                  </div>
                </div>
              </FAQItem>

              <FAQItem q="料金はかかりますか？">
                <p>
                  <strong>基本的に無料です。</strong>
                  LINE公式アカウントの「コミュニケーションプラン」（無料プラン）で利用できます。
                  クレジットカードの登録も不要です。
                </p>
                <p className="mt-2">
                  無料プランでは<strong>月200通</strong>までメッセージを送れます。
                  1通＝1人への1回のメッセージなので、例えばフォロワー50人にイベント通知を送ると50通消費します。
                  予約通知（DM）も1通にカウントされます。
                </p>
                <p className="mt-2">
                  200通を超えた場合はその月の残りのメッセージは送れなくなりますが、翌月にリセットされます。
                  より多くのメッセージが必要な場合は、有料プラン（ライトプラン: 月5,000円/5,000通〜）にアップグレードできます。
                </p>
              </FAQItem>

              <FAQItem q="既存のLINE公式アカウントを使えますか？">
                <p>
                  <strong>はい、使えます。</strong>
                  ただし、既存の公式アカウントを使う場合は「Messaging API」が有効化されている必要があります。
                </p>
                <p className="mt-2">
                  <a
                    href="https://manager.line.biz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#06C755] underline underline-offset-2 hover:no-underline"
                  >
                    LINE Official Account Manager
                  </a>
                  →「設定」→「Messaging API」から有効化できます。
                  有効化すると、LINE Developersコンソールにチャネルが自動作成されるので、
                  そこからトークンとシークレットを取得してください。
                </p>
                <p className="mt-2 text-xs text-[#999]">
                  注意: Messaging APIを有効化すると、一部の自動応答機能の動作が変わる場合があります。
                </p>
              </FAQItem>

              <FAQItem q="応答メッセージが返ってしまう・止めたい">
                <p>
                  LINE公式アカウントには初期設定で「応答メッセージ」がONになっています。
                  ユーザーがBotに何かメッセージを送ると「お問い合わせありがとうございます...」のような定型文が自動で返信されます。
                </p>
                <p className="mt-2">
                  これを無効にするには:
                </p>
                <ol className="list-decimal pl-4 mt-1 space-y-1">
                  <li>
                    <a
                      href="https://manager.line.biz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#06C755] underline underline-offset-2 hover:no-underline"
                    >
                      LINE Official Account Manager
                    </a>
                    にログイン
                  </li>
                  <li>対象のアカウントを選択 → 「設定」→「応答設定」</li>
                  <li>「応答メッセージ」をOFFにする</li>
                </ol>
                <p className="mt-2 text-xs text-[#999]">
                  あいさつメッセージ（友だち追加時の自動メッセージ）は残しておいてもOKです。
                  「友だち追加ありがとうございます！イベント情報をお届けします」のようなメッセージに変更すると良いでしょう。
                </p>
              </FAQItem>

              <FAQItem q="複数のイベント主催者で1つの公式アカウントを共有できますか？">
                <p>
                  <strong>現在は1つのアカウントにつき1人の主催者です。</strong>
                  petit event makerでは、LINE公式アカウントの連携はユーザーごとに行う仕組みになっています。
                </p>
                <p className="mt-2">
                  複数人でイベントを運営する場合は、それぞれが別のLINE公式アカウントを作成して連携するか、
                  代表者1人がアカウントを管理する形をおすすめします。
                </p>
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
