"use client";

/**
 * 課金・プラン設定ページ
 *
 * - 現在の plan / pro_until を表示
 * - PRO未契約: 月額・年額の選択 → Stripe Checkout
 * - PRO契約者: Customer Portal で管理（カード変更・解約）
 * - OPEN_ACCESS モード中の人には「現在は全員PRO機能利用可」の説明を出す
 */

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Crown,
  CheckCircle2,
  CreditCard,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

type ProStatus = {
  authenticated: boolean;
  is_pro: boolean;
  is_paid_pro: boolean;
  open_access: boolean;
  billing_configured: boolean;
  plan?: string;
  pro_until?: string | null;
  has_customer?: boolean;
};

const FEATURES = [
  { icon: "🎫", label: "1イベントに複数の料金プラン（通常/早割/VIP等）" },
  { icon: "📊", label: "LINE管理ダッシュボード（フォロワー推移・配信履歴）" },
  { icon: "💬", label: "LINEメッセージテンプレ・タグ別配信" },
  { icon: "⏰", label: "リマインダー複数スケジュール" },
  { icon: "📧", label: "申込→Xに自動LINEのステップ配信" },
  { icon: "🧪", label: "主催者向けテスト送信" },
  { icon: "🤖", label: "AI シラバス推薦・参加者AIレベル分析（予定）" },
];

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
          <Header />
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
          </div>
        </div>
      }
    >
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const { user, isLoading: authLoading } = useAuth();
  const sp = useSearchParams();
  const upgraded = sp.get("upgraded") === "1";
  const cancelled = sp.get("cancelled") === "1";

  const [status, setStatus] = useState<ProStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"monthly" | "yearly" | "portal" | null>(
    null
  );
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pro/status", { cache: "no-store" });
      if (res.ok) {
        setStatus((await res.json()) as ProStatus);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void fetchStatus();
  }, [user, fetchStatus]);

  const startCheckout = async (billing: "monthly" | "yearly") => {
    setSubmitting(billing);
    setError("");
    try {
      const res = await fetch("/api/pro/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "アップグレードに失敗しました");
        setSubmitting(null);
        return;
      }
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      setError("通信エラーが発生しました");
      setSubmitting(null);
    }
  };

  const openPortal = async () => {
    setSubmitting("portal");
    setError("");
    try {
      const res = await fetch("/api/pro/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ポータルを開けませんでした");
        setSubmitting(null);
        return;
      }
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      setError("通信エラーが発生しました");
      setSubmitting(null);
    }
  };

  if (authLoading || (loading && !status)) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
        </div>
      </div>
    );
  }

  const isPaidPro = !!status?.is_paid_pro;
  const isOpenAccessPro = !!status?.open_access && !isPaidPro;
  const billingReady = !!status?.billing_configured;

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          ダッシュボードへ戻る
        </Link>

        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            <Crown className="h-6 w-6 text-amber-500" />
            プラン・お支払い
          </h1>
        </div>

        {/* 結果トースト */}
        {upgraded && (
          <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-900">
                PROプランへの登録が完了しました 🎉
              </p>
              <p className="text-xs text-emerald-800 mt-1">
                すべての PRO 機能をご利用いただけます。ありがとうございます！
              </p>
            </div>
          </div>
        )}
        {cancelled && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            お支払いがキャンセルされました。引き続き無料プランでご利用いただけます。
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 現状カード */}
        <div className="mb-8 rounded-2xl bg-white border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                isPaidPro || isOpenAccessPro
                  ? "bg-amber-100 text-amber-600"
                  : "bg-[#F2F2F2] text-[#666666]"
              }`}
            >
              <Crown className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#999999]">現在のプラン</p>
              <p className="text-xl font-bold text-[#1A1A1A]">
                {isPaidPro ? "PRO" : isOpenAccessPro ? "PRO（プレビュー期間）" : "無料プラン"}
              </p>
              {status?.pro_until && (
                <p className="mt-0.5 text-xs text-[#666666]">
                  次回更新: {new Date(status.pro_until).toLocaleDateString("ja-JP")}
                </p>
              )}
            </div>
          </div>

          {isOpenAccessPro && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
              <strong>プレビュー期間中</strong> につき、PROプラン機能をすべて無料でご利用いただけます。
              正式に課金を開始する際にあらためてお知らせします。
            </div>
          )}

          {isPaidPro && (
            <div className="mt-3">
              <Button
                type="button"
                onClick={openPortal}
                disabled={submitting === "portal"}
                variant="outline"
                className="gap-2 h-10 rounded-xl"
              >
                {submitting === "portal" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                サブスクリプションを管理
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* PRO機能一覧 */}
        <div className="mb-8 rounded-2xl bg-white border border-[#E5E5E5] p-6">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            PROプランの機能
          </h2>
          <ul className="space-y-2">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0">{f.icon}</span>
                <span className="text-[#1A1A1A]">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 価格プラン */}
        {!isPaidPro && (
          <div className="mb-8">
            <h2 className="text-base font-bold text-[#1A1A1A] mb-3">
              {isOpenAccessPro ? "正式版のお知らせ用" : "アップグレード"}
            </h2>
            {!billingReady && (
              <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                ⚠️ PRO課金は現在準備中です。Stripe Price ID が設定されたら有効になります。
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* 月額 */}
              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                <p className="text-xs text-[#999999]">月額プラン</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#1A1A1A]">¥980</span>
                  <span className="text-sm text-[#999999]">/月</span>
                </div>
                <p className="mt-2 text-xs text-[#666666] leading-relaxed">
                  いつでも解約OK。まずは試してみたい方向け。
                </p>
                <Button
                  type="button"
                  onClick={() => startCheckout("monthly")}
                  disabled={
                    !billingReady ||
                    submitting === "monthly" ||
                    submitting === "yearly"
                  }
                  className="mt-4 w-full h-11 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111] gap-2 disabled:opacity-50"
                >
                  {submitting === "monthly" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  月額プランで始める
                </Button>
              </div>

              {/* 年額 */}
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 relative">
                <span className="absolute -top-2 right-3 inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  2ヶ月分お得
                </span>
                <p className="text-xs text-[#999999]">年額プラン</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#1A1A1A]">¥9,800</span>
                  <span className="text-sm text-[#999999]">/年</span>
                </div>
                <p className="mt-2 text-xs text-[#666666] leading-relaxed">
                  実質 ¥816/月。長期で運用される方におすすめ。
                </p>
                <Button
                  type="button"
                  onClick={() => startCheckout("yearly")}
                  disabled={
                    !billingReady ||
                    submitting === "monthly" ||
                    submitting === "yearly"
                  }
                  className="mt-4 w-full h-11 rounded-xl bg-amber-500 text-white hover:bg-amber-600 gap-2 disabled:opacity-50"
                >
                  {submitting === "yearly" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  年額プランで始める
                </Button>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[#999999] leading-relaxed">
              ※ 決済は Stripe を経由します。カード情報はプチイベント作成くんのサーバーには保存されません。
              いつでも解約・プラン変更が可能です。
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
