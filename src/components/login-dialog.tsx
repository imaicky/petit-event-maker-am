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
  const { signInWithPassword, signUpWithPassword, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
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

  const handleClose = (value: boolean) => {
    if (!value) {
      setTimeout(() => {
        setEmail("");
        setPassword("");
        setError(null);
        setShowPassword(false);
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

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
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
