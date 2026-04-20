"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Zap,
  ZapOff,
  BookOpen,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

// ─── Reusable components (same pattern as LINE settings) ──────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#F2F2F2]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#999999]">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

const inputCls =
  "h-10 rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA]";

type StripeSettingsInfo = {
  id?: string;
  stripe_account_id: string | null;
  display_name: string;
  is_test_mode: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

// ─── Main component ──────────────────────────────────────────

export default function StripeSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<StripeSettingsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [secretKey, setSecretKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Fetch existing settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/settings");
      if (res.ok) {
        const json = await res.json();
        setSettings(json.stripeSettings ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchSettings();
  }, [user, fetchSettings]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Connect
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/stripe/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret_key: secretKey.trim() }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error || "接続に失敗しました");
        return;
      }

      setSettings(json.stripeSettings);
      setSecretKey("");
      showSuccess("Stripeアカウントを連携しました。Webhookも自動設定されました。");
    } catch {
      setErrorMsg("接続に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    setDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/stripe/settings", { method: "DELETE" });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error || "解除に失敗しました");
        return;
      }

      setSettings(null);
      showSuccess("Stripe連携を解除しました");
    } catch {
      setErrorMsg("解除に失敗しました。もう一度お試しください。");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        {/* Back link */}
        <Link
          href="/settings/profile"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          プロフィール設定へ戻る
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#635BFF]/10">
              <CreditCard className="h-5 w-5 text-[#635BFF]" />
            </div>
            <h1
              className="text-2xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              Stripe決済設定
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm text-[#999999]">
              Stripeを連携すると、有料イベントの参加費をクレジットカードで安全に受け取れます
            </p>
            <Link
              href="/settings/stripe/guide"
              className="shrink-0 inline-flex items-center gap-1 text-xs text-[#635BFF] hover:underline underline-offset-2"
            >
              <BookOpen className="h-3 w-3" />
              ガイド
            </Link>
          </div>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#635BFF]/10 border border-[#635BFF]/30 px-4 py-3 animate-in fade-in-0 slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 text-[#635BFF] shrink-0" />
            <p className="text-sm font-medium text-[#635BFF]">{successMsg}</p>
          </div>
        )}

        {/* Error toast */}
        {errorMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 animate-in fade-in-0 slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{errorMsg}</p>
          </div>
        )}

        <div className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
            </div>
          ) : settings ? (
            /* ─── Connected state ─── */
            <>
              <section className="rounded-2xl bg-white border-2 border-[#635BFF]/40 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#635BFF]/10 bg-[#635BFF]/5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#635BFF]">
                      連携中のStripeアカウント
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#635BFF] px-2.5 py-0.5 text-xs font-medium text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      接続済み
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#635BFF]/10">
                        <CreditCard className="h-6 w-6 text-[#635BFF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-[#1A1A1A] truncate">
                          {settings.display_name || "Stripe Account"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {settings.is_active ? (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5 text-[#635BFF]" />
                              <span className="text-xs text-[#635BFF] font-medium">
                                有効
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <ZapOff className="h-3.5 w-3.5 text-[#999999]" />
                              <span className="text-xs text-[#999999] font-medium">
                                無効
                              </span>
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              settings.is_test_mode
                                ? "bg-[#FF8C00]/10 text-[#FF8C00]"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {settings.is_test_mode
                              ? "テストモード"
                              : "本番モード"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#FAFAFA] border border-[#F2F2F2] px-4 py-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#635BFF] mt-0.5 shrink-0" />
                        <p className="text-xs text-[#666666]">
                          Webhookエンドポイントは
                          <span className="font-medium text-[#1A1A1A]">
                            自動設定済み
                          </span>
                          です。決済完了・返金の通知を自動受信します。
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-[#635BFF] mt-0.5 shrink-0" />
                        <p className="text-xs text-[#666666]">
                          シークレットキーは安全に暗号化保存されています。画面上には表示されません。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Guide link */}
              <SectionCard title="セットアップガイド">
                <div className="space-y-3">
                  <p className="text-sm text-[#666666]">
                    Stripeアカウントの作成手順やテスト決済の方法を画像付きで解説しています。
                  </p>
                  <Link
                    href="/settings/stripe/guide"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#635BFF]/10 text-[#635BFF] text-sm font-medium hover:bg-[#635BFF]/20 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    画像付きセットアップガイドを見る →
                  </Link>
                </div>
              </SectionCard>

              {/* Disconnect */}
              <SectionCard title="連携解除">
                <div className="space-y-3">
                  <p className="text-sm text-[#999999]">
                    Stripe連携を解除すると、有料イベントの決済が停止されます。Webhookも自動で削除されます。
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={deleting}
                    className="rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 gap-2"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Stripe連携を解除する
                  </Button>
                </div>
              </SectionCard>
            </>
          ) : (
            /* ─── Not connected state ─── */
            <>
              {/* Features preview */}
              <SectionCard title="連携するとできること">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#635BFF]/10">
                      <CreditCard className="h-4 w-4 text-[#635BFF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        有料イベントの決済を自動化
                      </p>
                      <p className="text-xs text-[#999999] mt-0.5">
                        参加者はクレジットカードで安全にお支払い。入金はStripeから自動で振り込まれます。
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#635BFF]/10">
                      <Shield className="h-4 w-4 text-[#635BFF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        カード情報は一切保存されません
                      </p>
                      <p className="text-xs text-[#999999] mt-0.5">
                        決済はStripeの安全な画面で行われ、主催者も参加者も安心です。
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Stripeアカウントを連携">
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="rounded-xl bg-[#FAFAFA] border border-[#F2F2F2] px-4 py-3">
                    <p className="text-sm text-[#666666] leading-relaxed">
                      Stripeダッシュボードの「開発者」→「APIキー」で取得した
                      <span className="font-medium text-[#1A1A1A]">
                        シークレットキー
                      </span>
                      を入力するだけで連携完了です。Webhookも自動設定されます。
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-[#1A1A1A]">
                      シークレットキー
                    </Label>
                    <Input
                      type="password"
                      placeholder="sk_test_... または sk_live_..."
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      className={inputCls}
                      autoComplete="off"
                    />
                    <p className="text-xs text-[#999999]">
                      テストモードのキー（sk_test_...）で試してから、本番キー（sk_live_...）に切り替えられます
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || !secretKey.trim()}
                    className="h-10 px-6 rounded-full bg-[#635BFF] text-white hover:bg-[#5851db] gap-2 disabled:opacity-60 shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        接続テスト中...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        接続テスト＆保存
                      </>
                    )}
                  </Button>
                </form>
              </SectionCard>

              {/* Setup guide */}
              <SectionCard title="設定手順">
                <ol className="space-y-3 text-sm text-[#666666]">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#999999]">
                      1
                    </span>
                    <span>
                      <a
                        href="https://dashboard.stripe.com/register"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#635BFF] underline underline-offset-2 hover:no-underline"
                      >
                        Stripeアカウント
                      </a>
                      を作成（既にお持ちの方はスキップ）
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#999999]">
                      2
                    </span>
                    <span>
                      ダッシュボードの「開発者」→「APIキー」でシークレットキーを取得
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#999999]">
                      3
                    </span>
                    <span>
                      上のフォームに貼り付けて「接続テスト＆保存」をクリック
                    </span>
                  </li>
                </ol>
                <div className="rounded-xl bg-[#635BFF]/5 border border-[#635BFF]/20 px-4 py-3 mt-4">
                  <p className="text-xs text-[#4a45b3]">
                    Webhook設定・署名シークレットの取得は<span className="font-medium">すべて自動</span>で行われます。手動設定は不要です。
                  </p>
                </div>
                <Link
                  href="/settings/stripe/guide"
                  className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-[#635BFF]/10 text-[#635BFF] text-sm font-medium hover:bg-[#635BFF]/20 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  画像付きの詳しいセットアップガイドを見る →
                </Link>
              </SectionCard>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-[#E5E5E5] py-6 text-center text-xs text-[#999999] hidden sm:block">
        <p>&copy; 2026 プチイベント作成くん</p>
      </footer>
    </div>
  );
}
