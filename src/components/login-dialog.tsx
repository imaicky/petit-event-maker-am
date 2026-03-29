"use client";

import { useState } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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
}

type Mode = "login" | "signup" | "reset" | "reset-sent";

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { signInWithPassword, signUpWithPassword, signInWithLINE, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const result =
      mode === "signup"
        ? await signUpWithPassword(email.trim(), password)
        : await signInWithPassword(email.trim(), password);

    setLoading(false);

    if (result.error) {
      if (result.error.includes("Invalid login credentials")) {
        setError(
          "メールアドレスまたはパスワードが正しくありません。初めての方は「新規登録」をお試しください。"
        );
      } else if (result.error.includes("already registered")) {
        setError("このメールアドレスは既に登録されています。ログインしてください。");
        setMode("login");
      } else if (result.error.includes("Password should be at least")) {
        setError("パスワードは6文字以上にしてください");
      } else {
        setError(result.error);
      }
    } else {
      handleClose(false);
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

  const handleClose = (value: boolean) => {
    if (!value) {
      setTimeout(() => {
        setEmail("");
        setPassword("");
        setError(null);
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
    setPassword("");
  };

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

  const titles: Record<Exclude<Mode, "reset-sent">, { title: string; desc: string }> = {
    login: { title: "ログイン", desc: "メールアドレスとパスワードでログイン" },
    signup: { title: "新規登録", desc: "メールアドレスとパスワードで登録" },
    reset: { title: "パスワード再設定", desc: "パスワード再設定メールを送信します" },
  };

  const { title, desc } = titles[mode];

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
          <>
            <Button
              type="button"
              onClick={handleLINELogin}
              disabled={lineLoading || loading}
              className="mt-4 w-full rounded-full h-12 text-base font-bold text-white gap-2"
              style={{ backgroundColor: "#06C755" }}
            >
              {lineLoading ? (
                "リダイレクト中..."
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  LINEでログイン
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
            <>
              <button
                type="button"
                onClick={() => switchMode("reset")}
                className="text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
              >
                パスワードを忘れた・初めてパスワードを設定する方
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mt-1"
              >
                アカウントをお持ちでない方はこちら
              </button>
            </>
          )}
          {mode === "signup" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors"
            >
              すでにアカウントをお持ちの方はこちら
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
