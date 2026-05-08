"use client";

import { useEffect, useState } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "login" | "signup";
}

type Mode = "login" | "signup" | "reset" | "reset-sent" | "signup-sent" | "needs-confirmation";

export function LoginDialog({ open, onOpenChange, defaultMode = "login" }: LoginDialogProps) {
  const { signInWithPassword, signUpWithPassword, signInWithLINE, signInWithGoogle, signInWithTwitter, resetPassword, resendConfirmationEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
    }
  }, [open, defaultMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    if (mode === "reset") {
      const result = await resetPassword(email.trim());
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setMode("reset-sent");
      }
      return;
    }

    if (!password) {
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const result = await signUpWithPassword(email.trim(), password);
      setLoading(false);

      if (result.error) {
        if (result.error.includes("already registered")) {
          setError("このメールアドレスは既に登録されています。ログインしてください。");
          setMode("login");
        } else if (result.error.includes("Password should be at least")) {
          setError("パスワードは6文字以上にしてください");
        } else {
          setError(result.error);
        }
        return;
      }

      // Either Supabase requires email confirmation or returned no session
      if (result.needsEmailConfirmation) {
        setMode("signup-sent");
        return;
      }
      handleClose(false);
      return;
    }

    // Login mode
    const result = await signInWithPassword(email.trim(), password);
    setLoading(false);

    if (result.error) {
      const msg = result.error.toLowerCase();
      if (msg.includes("email not confirmed") || result.code === "email_not_confirmed") {
        setMode("needs-confirmation");
      } else if (msg.includes("invalid login credentials")) {
        setError(
          "メールアドレスまたはパスワードが正しくありません。初めての方は「新規登録」をお試しください。"
        );
      } else if (msg.includes("password should be at least")) {
        setError("パスワードは6文字以上にしてください");
      } else {
        setError(result.error);
      }
    } else {
      handleClose(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    setError(null);
    setInfo(null);
    const result = await resendConfirmationEmail(email.trim());
    setResendLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setInfo("確認メールを再送信しました。受信箱をご確認ください。");
    }
  };

  const handleLINELogin = async () => {
    setLineLoading(true);
    setError(null);
    const result = await signInWithLINE();
    if (result.error) {
      setError(result.error);
      setLineLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLineLoading(true);
    setError(null);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setLineLoading(false);
    }
  };

  const handleTwitterLogin = async () => {
    setLineLoading(true);
    setError(null);
    const result = await signInWithTwitter();
    if (result.error) {
      setError(result.error);
      setLineLoading(false);
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setTimeout(() => {
        setEmail("");
        setPassword("");
        setError(null);
        setInfo(null);
        setShowPassword(false);
        setLineLoading(false);
        setMode("login");
      }, 200);
    }
    onOpenChange(value);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setInfo(null);
    setPassword("");
  };

  // Sign-up confirmation email sent screen
  if (mode === "signup-sent") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E5E5E5]">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F2F2F2]">
              <MailCheck className="h-7 w-7 text-[#1A1A1A]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                確認メールを送信しました
              </h3>
              <p className="mt-2 text-sm text-[#999999] leading-relaxed">
                <span className="font-medium text-[#1A1A1A]">{email}</span>
                <br />
                に届いたリンクをクリックすると、登録が完了します。
              </p>
              <div className="mt-4 rounded-xl bg-[#FFF8E1] border border-[#F4E4A8] p-3 text-left">
                <p className="text-xs font-bold text-[#8B6914] mb-1">
                  メールが見当たらない場合
                </p>
                <ul className="text-xs text-[#8B6914] leading-relaxed list-disc pl-4 space-y-0.5">
                  <li>件名「<span className="font-medium">プチイベント作成くん</span>」で検索</li>
                  <li>迷惑メール / プロモーションフォルダを確認</li>
                  <li>数分待ってから再送信を試す</li>
                </ul>
              </div>
              <p className="mt-3 text-xs text-[#DC2626] font-medium">
                ※ メール内のリンクをクリックするまでログインできません
              </p>
            </div>
            {info && (
              <p className="text-xs text-[#16a34a] px-1">{info}</p>
            )}
            {error && <p className="text-xs text-[#DC2626] px-1">{error}</p>}
            <div className="flex flex-col gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={resendLoading}
                className="rounded-full border-[#E5E5E5]"
              >
                {resendLoading ? "送信中..." : "確認メールを再送信"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-[#E5E5E5]"
                onClick={() => handleClose(false)}
              >
                閉じる
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Existing user tried to login but email not yet confirmed
  if (mode === "needs-confirmation") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E5E5E5]">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF3C7]">
              <MailCheck className="h-7 w-7 text-[#B45309]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                メールアドレスの確認が必要です
              </h3>
              <p className="mt-2 text-sm text-[#999999] leading-relaxed">
                <span className="font-medium text-[#1A1A1A]">{email}</span>
                <br />
                に送信した確認メールのリンクをクリックして、登録を完了してください。
              </p>
              <div className="mt-4 rounded-xl bg-[#FFF8E1] border border-[#F4E4A8] p-3 text-left">
                <p className="text-xs font-bold text-[#8B6914] mb-1">
                  メールが見当たらない場合
                </p>
                <ul className="text-xs text-[#8B6914] leading-relaxed list-disc pl-4 space-y-0.5">
                  <li>件名「<span className="font-medium">プチイベント作成くん</span>」で検索</li>
                  <li>迷惑メール / プロモーションフォルダを確認</li>
                  <li>下のボタンから再送信を試す</li>
                </ul>
              </div>
            </div>
            {info && (
              <p className="text-xs text-[#16a34a] px-1">{info}</p>
            )}
            {error && <p className="text-xs text-[#DC2626] px-1">{error}</p>}
            <div className="flex flex-col gap-2 w-full">
              <Button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111]"
              >
                {resendLoading ? "送信中..." : "確認メールを再送信"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-[#E5E5E5]"
                onClick={() => switchMode("login")}
              >
                ログイン画面に戻る
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Reset email sent confirmation
  if (mode === "reset-sent") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-2xl border-[#E5E5E5]">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F2F2F2]">
              <CheckCircle2 className="h-7 w-7 text-[#1A1A1A]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                パスワード再設定メールを送信しました
              </h3>
              <p className="mt-2 text-sm text-[#999999] leading-relaxed">
                <span className="font-medium text-[#1A1A1A]">{email}</span>
                <br />
                に届いたリンクからパスワードを設定してください。
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-2 rounded-full border-[#E5E5E5]"
              onClick={() => handleClose(false)}
            >
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const titles: Record<"login" | "signup" | "reset", { title: string; desc: string }> = {
    login: { title: "おかえりなさい", desc: "メールアドレスとパスワードでログイン" },
    signup: { title: "プチイベント作成くんへようこそ", desc: "30秒・無料で登録して、すぐにイベントを作れます" },
    reset: { title: "パスワード再設定", desc: "パスワード再設定メールを送信します" },
  };

  const formMode = mode as "login" | "signup" | "reset";
  const { title, desc } = titles[formMode];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-[#E5E5E5]">
        <DialogHeader className="text-center">
          <DialogTitle
            className="text-xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#999999]">
            {desc}
          </DialogDescription>
        </DialogHeader>

        {mode !== "reset" && (
          <div className="mt-2 grid grid-cols-2 rounded-full bg-[#F2F2F2] p-1">
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-full py-2 text-sm font-bold transition-all ${
                mode === "signup"
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#999999] hover:text-[#1A1A1A]"
              }`}
            >
              新規登録（はじめての方）
            </button>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-full py-2 text-sm font-bold transition-all ${
                mode === "login"
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#999999] hover:text-[#1A1A1A]"
              }`}
            >
              ログイン
            </button>
          </div>
        )}

        {mode === "signup" && (
          <ul className="mt-1 space-y-1.5 text-xs text-[#666666]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a] shrink-0" />
              クレジットカード不要・完全無料
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a] shrink-0" />
              メールアドレスとパスワードだけで登録
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#16a34a] shrink-0" />
              登録後すぐにイベント作成・申込受付ができます
            </li>
          </ul>
        )}

        {mode !== "reset" && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={lineLoading || loading}
                className="h-11 rounded-full bg-white border border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#FAFAFA] gap-2 font-medium"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#EA4335" d="M12 5c1.617 0 3.094.595 4.243 1.578l3.157-3.158C17.45 1.555 14.842.5 12 .5 7.27.5 3.198 3.21 1.21 7.158l3.677 2.86C5.872 7.103 8.689 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.275c0-.85-.075-1.671-.218-2.46H12v4.654h6.45c-.282 1.483-1.115 2.737-2.36 3.575l3.617 2.81C21.86 19.04 23.5 15.93 23.5 12.275z" />
                  <path fill="#FBBC05" d="M4.887 14.158a7.124 7.124 0 0 1-.387-2.158c0-.748.137-1.471.387-2.158L1.21 6.842A11.486 11.486 0 0 0 0 12c0 1.846.448 3.59 1.21 5.158l3.677-3z" />
                  <path fill="#34A853" d="M12 23.5c3.24 0 5.957-1.072 7.943-2.91l-3.617-2.81c-.992.668-2.272 1.072-4.326 1.072-3.31 0-6.128-2.103-7.113-5.027l-3.677 2.86C3.198 20.79 7.27 23.5 12 23.5z" />
                </svg>
                <span className="text-sm">Google</span>
              </Button>
              <Button
                type="button"
                onClick={handleTwitterLogin}
                disabled={lineLoading || loading}
                className="h-11 rounded-full bg-[#1A1A1A] hover:bg-[#000000] text-white gap-2 font-medium"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-sm">X (Twitter)</span>
              </Button>
            </div>
            <Button
              type="button"
              onClick={handleLINELogin}
              disabled={lineLoading || loading}
              className="mt-2 w-full rounded-full h-12 text-base font-bold text-white gap-2"
              style={{ backgroundColor: "#06C755" }}
            >
              {lineLoading ? (
                "リダイレクト中..."
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  {mode === "signup" ? "LINEではじめる" : "LINEでログイン"}
                </>
              )}
            </Button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#E5E5E5]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#999999]">または</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
            <Input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="pl-10 rounded-xl border-[#E5E5E5] h-12 text-base focus-visible:ring-[#1A1A1A]"
            />
          </div>

          {mode !== "reset" && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={mode === "signup" ? "パスワード（6文字以上）" : "パスワード"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 pr-10 rounded-xl border-[#E5E5E5] h-12 text-base focus-visible:ring-[#1A1A1A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#1A1A1A]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-[#DC2626] px-1">{error}</p>}

          {mode === "signup" && (
            <div className="rounded-xl bg-[#F2F7FB] border border-[#D6E4F0] p-3 text-xs text-[#1A4A6B] leading-relaxed">
              <span className="font-bold">登録手順</span>: 登録ボタンを押すと、入力されたアドレスに確認メールをお送りします。<span className="font-bold">メール内のリンクをクリックして初めて登録完了</span>となります。
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email.trim() || (mode !== "reset" && !password)}
            className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] h-12 text-base gap-2"
          >
            {loading ? (
              "処理中..."
            ) : (
              <>
                {mode === "login" && "ログイン"}
                {mode === "signup" && "登録する"}
                {mode === "reset" && "再設定メールを送信"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-2 flex flex-col items-center gap-1">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => switchMode("reset")}
              className="text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
            >
              パスワードを忘れた・初めてパスワードを設定する方
            </button>
          )}
          {mode === "reset" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors"
            >
              ログインに戻る
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
