"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  PlayCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";
import { VideoEmbed } from "@/components/video-embed";

type StepKey = "intro" | "channel" | "secret" | "token" | "webhook" | "done";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "intro", label: "はじめに" },
  { key: "channel", label: "チャネル作成" },
  { key: "secret", label: "Secret" },
  { key: "token", label: "Token" },
  { key: "webhook", label: "Webhook" },
  { key: "done", label: "完了" },
];

const SECRET_PATTERN = /^[a-f0-9]{32}$/i;

export default function LineWizardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<StepKey>("intro");
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("");
  const [tokenValid, setTokenValid] = useState<{
    displayName: string;
    basicId: string | null;
  } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, user, router]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const webhookUrl = useMemo(
    () =>
      typeof window !== "undefined"
        ? `${window.location.origin}/api/line/webhook`
        : "/api/line/webhook",
    []
  );

  const secretLooksValid = SECRET_PATTERN.test(secret.trim());

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const validateToken = async () => {
    if (!token.trim()) return;
    setValidating(true);
    setTokenError(null);
    setTokenValid(null);
    try {
      const res = await fetch("/api/line/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_access_token: token.trim() }),
      });
      const json = await res.json();
      if (!json.ok) {
        setTokenError(json.error || "検証に失敗しました");
        return;
      }
      setTokenValid({
        displayName: json.displayName,
        basicId: json.basicId,
      });
    } catch {
      setTokenError("ネットワークエラーが発生しました");
    } finally {
      setValidating(false);
    }
  };

  const submitConnection = async () => {
    if (!tokenValid) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: Record<string, string> = {
        channel_access_token: token.trim(),
      };
      if (secret.trim()) payload.channel_secret = secret.trim();
      const res = await fetch("/api/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error || "保存に失敗しました");
        return;
      }
      setStep("webhook");
    } catch {
      setSubmitError("ネットワークエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === "intro") setStep("channel");
    else if (step === "channel") setStep("secret");
    else if (step === "secret") setStep("token");
    else if (step === "token") submitConnection();
    else if (step === "webhook") setStep("done");
  };

  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.key);
  };

  const canGoNext = (() => {
    if (step === "intro") return true;
    if (step === "channel") return true;
    if (step === "secret") return secretLooksValid;
    if (step === "token") return !!tokenValid && !submitting;
    if (step === "webhook") return true;
    return false;
  })();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#FAFAFA] pb-20">
        {/* Progress strip */}
        <div className="bg-white border-b border-[#E5E5E5]">
          <div className="mx-auto max-w-2xl px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#999999]">
                ステップ {stepIndex + 1} / {STEPS.length}
              </p>
              <p className="text-xs font-medium text-[#1A1A1A]">
                {STEPS[stepIndex]?.label}
              </p>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#F2F2F2] overflow-hidden">
              <div
                className="h-full bg-[#1A1A1A] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-6 py-8">
          {/* ── Step: Intro ────────────────────────────────────── */}
          {step === "intro" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06C755]/10 mb-4">
                  <Sparkles className="h-7 w-7 text-[#06C755]" />
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3"
                  style={{ fontFamily: "var(--font-zen-maru)" }}
                >
                  LINE連携ガイド
                </h1>
                <p className="text-sm text-[#666666] leading-relaxed">
                  4つの簡単なステップで、LINE公式アカウントと
                  <br />
                  プチイベント作成くんを連携します。
                  <br />
                  <span className="text-xs text-[#999999]">所要時間：約5〜10分</span>
                </p>
              </div>

              <VideoEmbed title="LINE連携ガイド動画" />

              <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                <h2 className="text-sm font-bold text-[#1A1A1A] mb-3">
                  事前にご用意いただくもの
                </h2>
                <ul className="space-y-2 text-sm text-[#666666]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
                    <span>LINE Developers のアカウント（無料）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
                    <span>LINE公式アカウント（こちらも無料で作成できます）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
                    <span>このガイド画面はそのままにして、別タブで作業を進めるとスムーズです</span>
                  </li>
                </ul>
              </div>

              <p className="text-xs text-[#999999] text-center">
                すでに連携済みの方は{" "}
                <Link href="/settings/line" className="underline hover:text-[#1A1A1A]">
                  通常の設定画面へ
                </Link>
              </p>
            </div>
          )}

          {/* ── Step: Channel ─────────────────────────────────── */}
          {step === "channel" && (
            <div className="space-y-6">
              <h1
                className="text-2xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                ① チャネルを作成する
              </h1>
              <p className="text-sm text-[#666666] leading-relaxed">
                LINE Developers にログインし、Messaging API
                チャネルを作成してください。すでにチャネルがある方はそのまま次へ進めます。
              </p>

              <ol className="space-y-3 text-sm text-[#1A1A1A] list-decimal pl-5 [&>li]:pl-1">
                <li>下のボタンから LINE Developers コンソールを開く</li>
                <li>新規プロバイダーを作成（屋号や個人名でOK）</li>
                <li>
                  作成したプロバイダー内で「<span className="font-bold">Messaging API</span>」チャネルを新規作成
                </li>
                <li>チャネル名・アイコン・説明を入力（ユーザーに見える情報）</li>
                <li>作成後のチャネル設定画面までたどり着けたら次へ</li>
              </ol>

              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white px-5 py-3 text-sm font-bold transition-colors"
              >
                LINE Developers を開く
                <ExternalLink className="h-4 w-4" />
              </a>

              <div className="rounded-2xl border border-[#FFE2A8] bg-[#FFF8E1] p-4 text-xs text-[#8B6914] leading-relaxed">
                <p className="font-bold mb-1">⚠️ 「LINE Login」ではなく「Messaging API」</p>
                <p>
                  チャネル作成時に必ず「Messaging API」を選んでください。LINE
                  Login を選ぶと連携できません。
                </p>
              </div>
            </div>
          )}

          {/* ── Step: Channel Secret ───────────────────────────── */}
          {step === "secret" && (
            <div className="space-y-6">
              <h1
                className="text-2xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                ② Channel Secret を貼り付ける
              </h1>
              <p className="text-sm text-[#666666] leading-relaxed">
                LINE Developers のチャネル設定画面で「
                <span className="font-bold text-[#1A1A1A]">チャネル基本設定</span>
                」タブを開き、「
                <span className="font-bold text-[#1A1A1A]">チャネルシークレット</span>
                」をコピーして貼り付けてください。
              </p>

              <div>
                <label className="block text-xs font-bold text-[#666666] mb-2">
                  チャネルシークレット（32文字の英数字）
                </label>
                <Input
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="例: a1b2c3d4e5f6..."
                  className="h-12 rounded-xl border-[#E5E5E5] bg-white font-mono text-sm tracking-wide"
                  autoFocus
                />
                {secret.trim().length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {secretLooksValid ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#06C755]" />
                        <span className="text-[#06C755] font-medium">
                          形式OK（32文字の英数字）
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-[#DC2626]" />
                        <span className="text-[#DC2626]">
                          形式が違うようです。32文字の英数字（hex）を貼り付けてください
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <details className="rounded-2xl border border-[#E5E5E5] bg-white p-4 text-sm text-[#666666] [&_summary]:cursor-pointer">
                <summary className="font-bold text-[#1A1A1A]">
                  どこにある？場所がわからない場合
                </summary>
                <ol className="mt-3 space-y-2 list-decimal pl-5">
                  <li>LINE Developers コンソールでチャネルを開く</li>
                  <li>「チャネル基本設定」タブ（一番上）</li>
                  <li>下にスクロールして「チャネルシークレット」を探す</li>
                  <li>「Issue」または値そのものをコピー</li>
                </ol>
              </details>
            </div>
          )}

          {/* ── Step: Access Token ─────────────────────────────── */}
          {step === "token" && (
            <div className="space-y-6">
              <h1
                className="text-2xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                ③ Channel Access Token を貼り付ける
              </h1>
              <p className="text-sm text-[#666666] leading-relaxed">
                同じくチャネル設定画面で「
                <span className="font-bold text-[#1A1A1A]">Messaging API設定</span>
                」タブを開き、最下部の「
                <span className="font-bold text-[#1A1A1A]">チャネルアクセストークン（長期）</span>
                」を発行してコピーしてください。
              </p>

              <div>
                <label className="block text-xs font-bold text-[#666666] mb-2">
                  チャネルアクセストークン（長期）
                </label>
                <textarea
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTokenValid(null);
                    setTokenError(null);
                  }}
                  placeholder="長い英数字の文字列（170文字以上）"
                  className="w-full min-h-[100px] rounded-xl border border-[#E5E5E5] bg-white font-mono text-xs p-3 focus:outline-none focus:border-[#1A1A1A] focus:ring-2 focus:ring-[#1A1A1A]/20"
                  autoFocus
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={validateToken}
                    disabled={!token.trim() || validating}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    {validating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        検証中...
                      </>
                    ) : (
                      "貼り付けたら確認する"
                    )}
                  </Button>
                  {tokenValid && (
                    <span className="inline-flex items-center gap-1 text-xs text-[#06C755] font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      検出成功: {tokenValid.displayName}
                      {tokenValid.basicId && ` (${tokenValid.basicId})`}
                    </span>
                  )}
                </div>
                {tokenError && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-[#DC2626]">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{tokenError}</span>
                  </div>
                )}
                {submitError && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-[#DC2626]">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </div>

              <details className="rounded-2xl border border-[#E5E5E5] bg-white p-4 text-sm text-[#666666] [&_summary]:cursor-pointer">
                <summary className="font-bold text-[#1A1A1A]">
                  発行手順がわからない場合
                </summary>
                <ol className="mt-3 space-y-2 list-decimal pl-5">
                  <li>チャネルを開いた状態で「Messaging API設定」タブ</li>
                  <li>下にスクロールして「チャネルアクセストークン（長期）」</li>
                  <li>「発行」ボタンをクリック</li>
                  <li>表示された長い文字列をコピー</li>
                  <li className="text-[#DC2626] font-medium">
                    一度しか表示されないので必ずすぐ貼り付けてください
                  </li>
                </ol>
              </details>
            </div>
          )}

          {/* ── Step: Webhook ─────────────────────────────────── */}
          {step === "webhook" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#06C755]/10 border border-[#06C755]/30 p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#06C755] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">
                    LINE公式アカウントと連携できました 🎉
                  </p>
                  <p className="text-xs text-[#666666] mt-1">
                    残り1ステップ。Webhook URL を LINE Developers
                    に設定すると、友だち追加・メッセージ受信が動くようになります。
                  </p>
                </div>
              </div>

              <h1
                className="text-2xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                ④ Webhook URL を設定する
              </h1>
              <p className="text-sm text-[#666666] leading-relaxed">
                以下のURLをコピーして、LINE Developers の「Messaging API設定」→「
                <span className="font-bold text-[#1A1A1A]">Webhook URL</span>
                」欄に貼り付けてください。
              </p>

              <div className="flex gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="h-12 rounded-xl border-[#E5E5E5] bg-[#FAFAFA] font-mono text-xs"
                />
                <Button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111] gap-1.5 shrink-0"
                >
                  {webhookCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      コピー済
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      コピー
                    </>
                  )}
                </Button>
              </div>

              <ol className="space-y-2 text-sm text-[#1A1A1A] list-decimal pl-5">
                <li>上のURLをコピー</li>
                <li>LINE Developers のチャネル設定 →「Messaging API設定」</li>
                <li>「Webhook URL」欄に貼り付け → 「更新」</li>
                <li>「Webhookの利用」を <span className="font-bold">ON</span> に切り替え</li>
                <li>「検証」ボタンを押して「成功」が出たら完了</li>
              </ol>

              <a
                href="https://developers.line.biz/console/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white px-5 py-3 text-sm font-bold transition-colors"
              >
                LINE Developers を開く
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* ── Step: Done ────────────────────────────────────── */}
          {step === "done" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-[#06C755]/10 mb-2">
                  <CheckCircle2 className="h-8 w-8 text-[#06C755]" />
                </div>
                <h1
                  className="text-2xl sm:text-3xl font-bold text-[#1A1A1A]"
                  style={{ fontFamily: "var(--font-zen-maru)" }}
                >
                  連携完了！あと1ステップ
                </h1>
                <p className="text-sm text-[#666666] leading-relaxed mt-3">
                  これでイベント公開時に LINE 公式アカウントのフォロワー全員へ告知が届きます。
                </p>
              </div>

              {/* ★ 必須: 通知先登録 */}
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5">
                <p className="text-sm font-bold text-amber-900 mb-2">
                  ⚠️ 予約通知を受け取るには、もう1つ設定が必要です
                </p>
                <p className="text-xs text-amber-900/85 leading-relaxed mb-3">
                  あなたのLINEに予約通知を届けるために、<strong>通知先LINEを登録</strong>してください。次のどちらかの方法で登録できます:
                </p>
                <div className="space-y-2 text-xs text-amber-900/85">
                  <div className="rounded-lg bg-white/70 border border-amber-200 p-3">
                    <p className="font-semibold mb-1">方法A: LINEで友だち追加してコマンド送信（簡単）</p>
                    <ol className="list-decimal pl-4 space-y-0.5">
                      <li>スマホで連携した公式アカウントを友だち追加</li>
                      <li>トーク画面に「<strong>通知ON</strong>」と送信</li>
                      <li>「✅ 通知を有効化しました」が返ってきたらOK</li>
                    </ol>
                  </div>
                  <div className="rounded-lg bg-white/70 border border-amber-200 p-3">
                    <p className="font-semibold mb-1">方法B: 設定画面でLINEユーザーIDを直接入力</p>
                    <p className="leading-relaxed">
                      LINE設定画面の「通知先（管理者LINE）」セクションから入力できます。
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <Link href="/settings/line">
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-[#E5E5E5]"
                  >
                    通知先を登録する
                  </Button>
                </Link>
                <Link href="/events/new">
                  <Button className="w-full rounded-full bg-[#1A1A1A] hover:bg-[#111111] text-white">
                    イベントを作る
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* ── Navigation ────────────────────────────────────── */}
          {step !== "done" && (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#E5E5E5]">
              <Button
                variant="ghost"
                onClick={goPrev}
                disabled={stepIndex === 0 || submitting}
                className="rounded-full text-[#666666] gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                前へ
              </Button>
              <Button
                onClick={goNext}
                disabled={!canGoNext}
                className="rounded-full bg-[#1A1A1A] hover:bg-[#111111] text-white gap-1.5 px-6"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : step === "token" ? (
                  <>
                    保存して次へ
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : step === "webhook" ? (
                  <>
                    完了する
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    次へ
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ── Help link ─────────────────────────────────────── */}
          {step !== "done" && (
            <div className="mt-6 text-center">
              <Link
                href="/settings/line/guide"
                className="inline-flex items-center gap-1 text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                詳しい手順マニュアルを開く
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
