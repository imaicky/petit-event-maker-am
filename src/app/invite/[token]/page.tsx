"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Calendar, MapPin, Loader2, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

type InviteInfo = {
  invite: { id: string; status: string };
  event: {
    id: string;
    title: string;
    datetime: string;
    location: string | null;
    creator_name: string | null;
  };
};

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { user, isLoading: authLoading } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch invite info
  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "招待が見つかりません");
          return;
        }
        const data = await res.json();
        setInviteInfo(data);
      } catch {
        setError("招待情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  // Auto-accept if logged in and invite is pending
  useEffect(() => {
    if (authLoading || !user || !inviteInfo) return;
    if (inviteInfo.invite.status === "accepted") {
      setSuccess(true);
      return;
    }
    acceptInvite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, inviteInfo]);

  async function acceptInvite() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Already accepted
          setSuccess(true);
          return;
        }
        setError(data.error ?? "招待の受諾に失敗しました");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch {
      setError("招待の受諾に失敗しました");
    } finally {
      setAccepting(false);
    }
  }

  if (loading || authLoading) {
    return (
      <main className="min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A] mb-4" />
          <p className="text-sm text-[#999999]">読み込み中...</p>
        </div>
      </main>
    );
  }

  if (error && !inviteInfo) {
    return (
      <main className="min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 mb-4">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-lg font-bold text-[#1A1A1A] mb-2">招待が無効です</p>
          <p className="text-sm text-[#999999] mb-6 text-center max-w-xs">
            {error}
          </p>
          <Button
            variant="outline"
            className="rounded-full border-[#E5E5E5] hover:border-[#1A1A1A]/30"
            onClick={() => router.push("/")}
          >
            トップに戻る
          </Button>
        </div>
      </main>
    );
  }

  const event = inviteInfo?.event;

  // Not logged in — prompt to log in
  if (!user) {
    return (
      <main className="min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
            <div className="p-6 border-b border-[#F2F2F2]">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F7]">
                  <UserPlus className="h-5 w-5 text-[#1A1A1A]" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">共同管理者への招待</p>
                  <p className="text-sm font-bold text-[#1A1A1A]">
                    {event?.creator_name ?? "主催者"}さんからの招待
                  </p>
                </div>
              </div>

              {event && (
                <div className="rounded-xl bg-[#FAFAFA] p-4">
                  <h3
                    className="text-base font-bold text-[#1A1A1A] mb-2"
                    style={{ fontFamily: "var(--font-zen-maru)" }}
                  >
                    {event.title}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-xs text-[#999999]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(event.datetime).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                        timeZone: "Asia/Tokyo",
                      })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 text-center">
              <p className="text-sm text-[#999999] mb-4">
                招待を受けるにはログインが必要です
              </p>
              <Button
                className="w-full h-11 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111]"
                onClick={() => router.push(`/auth/login?redirect=/invite/${token}`)}
              >
                ログインして招待を受ける
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Logged in — show status
  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
          <div className="p-6 border-b border-[#F2F2F2]">
            {event && (
              <div className="rounded-xl bg-[#FAFAFA] p-4 mb-4">
                <h3
                  className="text-base font-bold text-[#1A1A1A] mb-2"
                  style={{ fontFamily: "var(--font-zen-maru)" }}
                >
                  {event.title}
                </h3>
                <div className="flex flex-wrap gap-3 text-xs text-[#999999]">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(event.datetime).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                      timeZone: "Asia/Tokyo",
                    })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 text-center">
            {accepting && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A] mx-auto mb-3" />
                <p className="text-sm text-[#999999]">招待を受諾しています...</p>
              </>
            )}

            {success && (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 mx-auto mb-3">
                  <CheckCircle2 className="h-7 w-7 text-green-500" />
                </div>
                <p className="text-base font-bold text-[#1A1A1A] mb-1">
                  共同管理者になりました
                </p>
                <p className="text-sm text-[#999999] mb-4">
                  ダッシュボードに移動します...
                </p>
                <Button
                  className="rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111]"
                  onClick={() => router.push("/dashboard")}
                >
                  ダッシュボードへ
                </Button>
              </>
            )}

            {error && !accepting && !success && (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mx-auto mb-3">
                  <XCircle className="h-7 w-7 text-red-400" />
                </div>
                <p className="text-base font-bold text-[#1A1A1A] mb-1">
                  エラー
                </p>
                <p className="text-sm text-[#999999] mb-4">{error}</p>
                <Button
                  variant="outline"
                  className="rounded-full border-[#E5E5E5] hover:border-[#1A1A1A]/30"
                  onClick={() => router.push("/dashboard")}
                >
                  ダッシュボードに戻る
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
