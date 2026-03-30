"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  const [errorInfo, setErrorInfo] = useState<{
    error: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    // Parse error from URL hash fragment
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const error = params.get("error_code") || params.get("error") || "unknown";
    const description =
      params.get("error_description")?.replace(/\+/g, " ") ||
      "ログイン中にエラーが発生しました";
    setErrorInfo({ error, description });
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#FAFAFA] px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>

        <h1
          className="text-xl font-bold text-[#1A1A1A] mb-2"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          ログインできませんでした
        </h1>

        <p className="text-sm text-[#999999] mb-6">
          {errorInfo?.description || "もう一度お試しください"}
        </p>

        {errorInfo?.error && (
          <p className="text-xs text-[#CCCCCC] mb-6 font-mono">
            Error: {errorInfo.error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Link href="/">
            <Button className="w-full h-11 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111]">
              トップページに戻る
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
