"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { LogIn, CalendarDays, Loader2 } from "lucide-react";

export function LandingHeader() {
  const { user, isLoading, signInWithGoogle } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full glass border-b border-[#E5E5E5]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          className="flex items-baseline gap-1.5 group"
          aria-label="プチイベント作成くん トップへ"
        >
          <span
            className="text-xl font-bold text-[#1A1A1A] group-hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            プチイベント
          </span>
          <span
            className="text-sm font-medium text-[#999999] group-hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            作成くん
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/explore">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex rounded-full text-[#1A1A1A] hover:text-[#1A1A1A] hover:bg-[#F2F2F2]"
            >
              イベントを探す
            </Button>
          </Link>

          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#999999]" />
          ) : user ? (
            <>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#F2F2F2] hover:border-[#1A1A1A]/30 gap-1.5"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  ダッシュボード
                </Button>
              </Link>
              <Link href="/events/new">
                <Button
                  size="sm"
                  className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] shadow-sm"
                >
                  イベントを作る
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signInWithGoogle()}
                className="rounded-full border-[#E5E5E5] text-[#1A1A1A] hover:bg-[#F2F2F2] hover:border-[#1A1A1A]/30 gap-1.5"
              >
                <LogIn className="h-3.5 w-3.5" />
                ログイン
              </Button>
              <Link href="/events/new">
                <Button
                  size="sm"
                  className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] shadow-sm"
                >
                  無料ではじめる
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
