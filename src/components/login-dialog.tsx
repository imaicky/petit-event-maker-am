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

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                メールアドレスにログインリンクを送信します
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
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
                className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] h-12 text-base gap-2"
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
