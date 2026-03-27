"use client";

import { useState } from "react";
import { Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
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

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);

    const result = isSignUp
      ? await signUpWithPassword(email.trim(), password)
      : await signInWithPassword(email.trim(), password);

    setLoading(false);

    if (result.error) {
      if (result.error.includes("Invalid login credentials")) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else if (result.error.includes("already registered")) {
        setError("このメールアドレスは既に登録されています。ログインしてください。");
        setIsSignUp(false);
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
      }, 200);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-[#E5E5E5]">
        <DialogHeader className="text-center">
          <DialogTitle
            className="text-xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            {isSignUp ? "新規登録" : "ログイン"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#999999]">
            {isSignUp
              ? "メールアドレスとパスワードで登録"
              : "メールアドレスとパスワードでログイン"}
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

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="パスワード"
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

          {error && (
            <p className="text-sm text-[#DC2626] px-1">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] h-12 text-base gap-2"
          >
            {loading ? (
              "処理中..."
            ) : (
              <>
                {isSignUp ? "登録する" : "ログイン"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp((v) => !v);
              setError(null);
            }}
            className="text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors"
          >
            {isSignUp
              ? "すでにアカウントをお持ちの方はこちら"
              : "アカウントをお持ちでない方はこちら"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
