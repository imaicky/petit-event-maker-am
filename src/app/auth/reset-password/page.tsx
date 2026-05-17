"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 認証セッションを確認。リセットメールのリンク経由でログインされている前提。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        setAuthedEmail(data.user.email ?? null);
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください");
      return;
    }
    if (password !== confirm) {
      setError("確認用パスワードが一致しません");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message || "パスワードの更新に失敗しました");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace("/dashboard"), 2000);
  };

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FAFAFA] px-4">
        <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
      </main>
    );
  }

  if (!authedEmail) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FAFAFA] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h1
            className="text-xl font-bold text-[#1A1A1A] mb-2"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            セッションがありません
          </h1>
          <p className="text-sm text-[#999999] mb-6 leading-relaxed">
            パスワード再設定のリンクの有効期限が切れたか、別のブラウザで開かれた可能性があります。
            <br />
            もう一度メールを送信してください。
          </p>
          <Link href="/">
            <Button className="w-full h-11 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111]">
              トップページに戻る
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FAFAFA] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h1
            className="text-xl font-bold text-[#1A1A1A] mb-2"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            パスワードを更新しました
          </h1>
          <p className="text-sm text-[#999999]">
            まもなくダッシュボードに移動します...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#FAFAFA] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2F2F2]">
          <KeyRound className="h-8 w-8 text-[#1A1A1A]" />
        </div>

        <h1
          className="text-center text-xl font-bold text-[#1A1A1A] mb-2"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          新しいパスワードを設定
        </h1>
        <p className="text-center text-sm text-[#999999] mb-6">
          {authedEmail} の新しいパスワードを入力してください
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-[#1A1A1A]">
              新しいパスワード
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="6文字以上"
                className="h-11 pr-10 rounded-xl border-[#E5E5E5] bg-white focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#1A1A1A]"
                tabIndex={-1}
                aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-sm font-medium text-[#1A1A1A]">
              新しいパスワード（確認）
            </Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="もう一度入力"
              className="h-11 rounded-xl border-[#E5E5E5] bg-white focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !password || !confirm}
            className="w-full h-11 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111] disabled:opacity-60 gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                更新中...
              </>
            ) : (
              "パスワードを更新する"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/dashboard"
            className="text-sm text-[#999999] hover:text-[#1A1A1A] hover:underline"
          >
            パスワード変更をスキップ
          </Link>
        </div>
      </div>
    </main>
  );
}
