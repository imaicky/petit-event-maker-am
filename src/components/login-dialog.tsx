"use client";

import { useState } from "react";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError(null);

    const result = await signInWithEmail(email.trim());

    setSending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setTimeout(() => {
        setEmail("");
        setSent(false);
        setError(null);
        setShowEmailForm(false);
      }, 200);
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-[#E5E5E5]">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F2F2F2]">
              <CheckCircle2 className="h-7 w-7 text-[#1A1A1A]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                メールを送信しました
              </h3>
              <p className="mt-2 text-sm text-[#999999] leading-relaxed">
                <span className="font-medium text-[#1A1A1A]">{email}</span>
                <br />
                に届いたリンクをクリックしてログインしてください。
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
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle
                className="text-xl font-bold text-[#1A1A1A]"
                style={{ fontFamily: "var(--font-zen-maru)" }}
              >
                ログイン
              </DialogTitle>
              <DialogDescription className="text-sm text-[#999999]">
                アカウントにログインしてイベントを作成
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-3">
              {/* Google login */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="h-12 rounded-xl border-[#E5E5E5] text-base font-medium gap-3 hover:bg-[#F7F7F7]"
              >
                <GoogleIcon className="h-5 w-5" />
                Googleでログイン
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="h-px flex-1 bg-[#E5E5E5]" />
                <span className="text-xs text-[#999999]">または</span>
                <div className="h-px flex-1 bg-[#E5E5E5]" />
              </div>

              {/* Email login */}
              {showEmailForm ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
                    <Input
                      type="email"
                      placeholder="メールアドレスを入力"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="pl-10 rounded-xl border-[#E5E5E5] h-12 text-base focus-visible:ring-[#1A1A1A]"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-[#DC2626] px-1">{error}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={sending || !email.trim()}
                    className="rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111] h-12 text-base gap-2"
                  >
                    {sending ? (
                      "送信中..."
                    ) : (
                      <>
                        ログインリンクを送信
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEmailForm(true)}
                  className="h-12 rounded-xl text-sm text-[#999999] hover:text-[#1A1A1A] gap-2"
                >
                  <Mail className="h-4 w-4" />
                  メールアドレスでログイン
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
