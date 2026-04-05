"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Loader2,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Zap,
  ZapOff,
  Bell,
  BellOff,
  Sparkles,
  Copy,
  Check,
  Users,
  UserCheck,
  Tag,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

// ─── Reusable components (same pattern as profile settings) ──

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#F2F2F2]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#999999]">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

type LineAccountInfo = {
  id: string;
  channel_name: string;
  bot_user_id: string | null;
  owner_line_user_id: string | null;
  is_active: boolean;
  notify_on_booking: boolean;
  created_at: string;
  updated_at: string;
};

type Follower = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  is_following: boolean;
  followed_at: string;
  tags: string[];
};

const inputCls =
  "h-10 rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA]";

// ─── Main component ──────────────────────────────────────────

export default function LineSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [lineAccount, setLineAccount] = useState<LineAccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Followers
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [ownerLineUserId, setOwnerLineUserId] = useState<string | null>(null);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [settingOwner, setSettingOwner] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Fetch existing LINE account
  const fetchLineAccount = useCallback(async () => {
    try {
      const res = await fetch("/api/line");
      if (res.ok) {
        const json = await res.json();
        setLineAccount(json.lineAccount ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch followers
  const fetchFollowers = useCallback(async () => {
    setFollowersLoading(true);
    try {
      const res = await fetch("/api/line/followers");
      if (res.ok) {
        const json = await res.json();
        setFollowers(json.followers ?? []);
        setOwnerLineUserId(json.owner_line_user_id ?? null);
      }
    } catch {
      // ignore
    } finally {
      setFollowersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchLineAccount();
  }, [user, fetchLineAccount]);

  useEffect(() => {
    if (lineAccount) fetchFollowers();
  }, [lineAccount, fetchFollowers]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Connect / update LINE account
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: Record<string, string> = {
        channel_access_token: token.trim(),
      };
      if (secret.trim()) {
        payload.channel_secret = secret.trim();
      }

      const res = await fetch("/api/line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.error || "接続に失敗しました");
        return;
      }

      setLineAccount(json.lineAccount);
      setToken("");
      setSecret("");
      showSuccess("LINE公式アカウントを連携しました");
    } catch {
      setErrorMsg("接続に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  // Disconnect LINE account
  const handleDisconnect = async () => {
    setDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/line", { method: "DELETE" });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error || "解除に失敗しました");
        return;
      }

      setLineAccount(null);
      setFollowers([]);
      setOwnerLineUserId(null);
      showSuccess("LINE連携を解除しました");
    } catch {
      setErrorMsg("解除に失敗しました。もう一度お試しください。");
    } finally {
      setDeleting(false);
    }
  };

  // Toggle notify_on_booking
  const handleToggleBookingNotify = async (checked: boolean) => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify_on_booking: checked }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "設定の更新に失敗しました");
        return;
      }
      setLineAccount(json.lineAccount);
      showSuccess(checked ? "予約通知をONにしました" : "予約通知をOFFにしました");
    } catch {
      setErrorMsg("設定の更新に失敗しました");
    }
  };

  // Copy webhook URL
  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/line/webhook`
    : "";

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Set owner
  const handleSetOwner = async (lineUserId: string) => {
    setSettingOwner(lineUserId);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line/set-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_user_id: lineUserId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "通知先の設定に失敗しました");
        return;
      }
      setOwnerLineUserId(lineUserId);
      setLineAccount((prev) =>
        prev ? { ...prev, owner_line_user_id: lineUserId } : prev
      );
      showSuccess("通知先を設定しました。予約通知がDMで届きます");
    } catch {
      setErrorMsg("通知先の設定に失敗しました");
    } finally {
      setSettingOwner(null);
    }
  };

  const handleAddTag = async (followerId: string, currentTags: string[]) => {
    const tag = tagInput.trim();
    if (!tag) return;
    const newTags = [...new Set([...currentTags, tag])];
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/line/followers/${followerId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
      if (!res.ok) {
        setErrorMsg("タグの更新に失敗しました");
        return;
      }
      setFollowers((prev) =>
        prev.map((f) => (f.id === followerId ? { ...f, tags: newTags } : f))
      );
      setTagInput("");
    } catch {
      setErrorMsg("タグの更新に失敗しました");
    }
  };

  const handleRemoveTag = async (followerId: string, currentTags: string[], tagToRemove: string) => {
    const newTags = currentTags.filter((t) => t !== tagToRemove);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/line/followers/${followerId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
      if (!res.ok) {
        setErrorMsg("タグの削除に失敗しました");
        return;
      }
      setFollowers((prev) =>
        prev.map((f) => (f.id === followerId ? { ...f, tags: newTags } : f))
      );
    } catch {
      setErrorMsg("タグの削除に失敗しました");
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        {/* Back link */}
        <Link
          href="/settings/profile"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          プロフィール設定へ戻る
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755]/10">
              <MessageSquare className="h-5 w-5 text-[#06C755]" />
            </div>
            <h1
              className="text-2xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              LINE連携設定
            </h1>
          </div>
          <p className="mt-2 text-sm text-[#999999]">
            LINE公式アカウントを連携すると、イベント作成時にフォロワーへ自動通知が送れます
          </p>
        </div>

        {/* Success toast */}
        {successMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#06C755]/10 border border-[#06C755]/30 px-4 py-3 animate-in fade-in-0 slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 text-[#06C755] shrink-0" />
            <p className="text-sm font-medium text-[#06C755]">{successMsg}</p>
          </div>
        )}

        {/* Error toast */}
        {errorMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 animate-in fade-in-0 slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{errorMsg}</p>
          </div>
        )}

        <div className="space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
            </div>
          ) : lineAccount ? (
            /* ─── Connected state ─── */
            <>
              <section className="rounded-2xl bg-white border-2 border-[#06C755]/40 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#06C755]/10 bg-[#06C755]/5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#06C755]">
                      連携中のLINE公式アカウント
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#06C755] px-2.5 py-0.5 text-xs font-medium text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      接続済み
                    </span>
                  </div>
                </div>
                <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#06C755]/10">
                      <MessageSquare className="h-6 w-6 text-[#06C755]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-[#1A1A1A] truncate">
                        {lineAccount.channel_name || "LINE Bot"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {lineAccount.is_active ? (
                          <>
                            <Zap className="h-3.5 w-3.5 text-[#06C755]" />
                            <span className="text-xs text-[#06C755] font-medium">
                              有効
                            </span>
                          </>
                        ) : (
                          <>
                            <ZapOff className="h-3.5 w-3.5 text-[#999999]" />
                            <span className="text-xs text-[#999999] font-medium">
                              無効
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#FAFAFA] border border-[#F2F2F2] px-4 py-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-[#06C755] mt-0.5 shrink-0" />
                      <p className="text-xs text-[#666666]">
                        イベント公開時、画像・日時・価格付きの<span className="font-medium text-[#1A1A1A]">リッチカード（Flex Message）</span>がフォロワーに届きます
                      </p>
                    </div>
                  </div>
                </div>
                </div>
              </section>

              {/* Webhook URL */}
              <SectionCard title="Webhook URL">
                <div className="space-y-3">
                  <p className="text-sm text-[#666666]">
                    以下のURLをLINE Developersコンソールの「Messaging API設定」→「Webhook URL」に設定してください。
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className={`${inputCls} flex-1 text-xs font-mono`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyWebhook}
                      className="h-10 w-10 rounded-xl border-[#E5E5E5] shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-[#06C755]" />
                      ) : (
                        <Copy className="h-4 w-4 text-[#666666]" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-[#999999]">
                    Webhook URLを設定すると、友だち追加・ブロック解除を自動検知できます
                  </p>
                </div>
              </SectionCard>

              {/* Followers list */}
              <SectionCard title="フォロワー一覧">
                <div className="space-y-4">
                  {followersLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-[#999999]" />
                    </div>
                  ) : followers.length === 0 ? (
                    <div className="text-center py-6">
                      <Users className="h-8 w-8 text-[#E5E5E5] mx-auto mb-2" />
                      <p className="text-sm text-[#999999]">
                        まだフォロワーがいません
                      </p>
                      <p className="text-xs text-[#999999] mt-1">
                        Webhook URLを設定後、LINE公式アカウントを友だち追加すると表示されます
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {followers.map((f) => {
                        const isOwner = ownerLineUserId === f.line_user_id;
                        return (
                          <div key={f.id} className="space-y-1">
                            <div
                              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                                isOwner
                                  ? "border-[#06C755]/30 bg-[#06C755]/5"
                                  : "border-[#F2F2F2] bg-[#FAFAFA]"
                              }`}
                            >
                              {f.picture_url ? (
                                <Image
                                  src={f.picture_url}
                                  alt={f.display_name ?? ""}
                                  width={36}
                                  height={36}
                                  className="rounded-full shrink-0"
                                />
                              ) : (
                                <div className="h-9 w-9 rounded-full bg-[#E5E5E5] flex items-center justify-center shrink-0">
                                  <Users className="h-4 w-4 text-[#999999]" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#1A1A1A] truncate">
                                  {f.display_name || "名前なし"}
                                </p>
                                <p className="text-xs text-[#999999]">
                                  {new Date(f.followed_at).toLocaleDateString("ja-JP")} フォロー
                                </p>
                              </div>
                              {isOwner ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-[#06C755] shrink-0">
                                  <UserCheck className="h-3.5 w-3.5" />
                                  通知先
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetOwner(f.line_user_id)}
                                  disabled={settingOwner === f.line_user_id}
                                  className="rounded-full text-xs h-7 px-3 border-[#E5E5E5] shrink-0"
                                >
                                  {settingOwner === f.line_user_id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "通知先に設定"
                                  )}
                                </Button>
                              )}
                            </div>
                            {/* Tags */}
                            <div className="ml-12 flex flex-wrap items-center gap-1">
                            {(f.tags ?? []).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F2] px-2 py-0.5 text-xs text-[#666666]"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(f.id, f.tags ?? [], tag)}
                                  className="hover:text-red-500"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                            {editingTags === f.id ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleAddTag(f.id, f.tags ?? []);
                                }}
                                className="inline-flex items-center gap-1"
                              >
                                <input
                                  type="text"
                                  value={tagInput}
                                  onChange={(e) => setTagInput(e.target.value)}
                                  placeholder="タグ名"
                                  className="h-5 w-20 rounded border border-[#E5E5E5] px-1.5 text-xs focus:outline-none focus:border-[#1A1A1A]"
                                  autoFocus
                                  onBlur={() => {
                                    if (!tagInput.trim()) {
                                      setEditingTags(null);
                                    }
                                  }}
                                />
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTags(f.id);
                                  setTagInput("");
                                }}
                                className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[#E5E5E5] px-2 py-0.5 text-xs text-[#999999] hover:text-[#1A1A1A] hover:border-[#1A1A1A]"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                + タグ
                              </button>
                            )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {ownerLineUserId && (
                    <div className="rounded-xl bg-[#FAFAFA] border border-[#F2F2F2] px-4 py-3">
                      <p className="text-xs text-[#666666]">
                        通知先に設定すると、予約通知がブロードキャストではなく <span className="font-medium text-[#1A1A1A]">1:1のDM</span> で届きます
                      </p>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Notification settings */}
              <SectionCard title="通知設定">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {lineAccount.notify_on_booking ? (
                        <Bell className="h-5 w-5 text-[#06C755] mt-0.5 shrink-0" />
                      ) : (
                        <BellOff className="h-5 w-5 text-[#999999] mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[#1A1A1A]">
                          新規予約の LINE 通知
                        </p>
                        <p className="text-xs text-[#999999] mt-0.5">
                          予約が入ったとき、LINE で通知を受け取ります
                          {lineAccount.owner_line_user_id
                            ? "（DMで届きます）"
                            : "（ブロードキャストで届きます）"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={lineAccount.notify_on_booking}
                      onCheckedChange={handleToggleBookingNotify}
                    />
                  </div>
                </div>
              </SectionCard>

              {/* Disconnect */}
              <SectionCard title="連携解除">
                <div className="space-y-3">
                  <p className="text-sm text-[#999999]">
                    LINE連携を解除すると、イベント作成時の自動通知が停止されます。トークン情報も削除されます。
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={deleting}
                    className="rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 gap-2"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    LINE連携を解除する
                  </Button>
                </div>
              </SectionCard>
            </>
          ) : (
            /* ─── Not connected state ─── */
            <>
              {/* Features preview */}
              <SectionCard title="連携するとできること">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06C755]/10">
                      <Sparkles className="h-4 w-4 text-[#06C755]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        リッチカードでイベント告知
                      </p>
                      <p className="text-xs text-[#999999] mt-0.5">
                        画像・日時・価格付きの見やすいカードがフォロワーに届きます
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06C755]/10">
                      <Bell className="h-4 w-4 text-[#06C755]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        予約通知をDMで受信
                      </p>
                      <p className="text-xs text-[#999999] mt-0.5">
                        新しい予約が入ると LINE のDMで通知が届きます（ON/OFF 設定可能）
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="LINE公式アカウントを連携">
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="rounded-xl bg-[#FAFAFA] border border-[#F2F2F2] px-4 py-3">
                    <p className="text-sm text-[#666666] leading-relaxed">
                      LINE Developersコンソールで発行した
                      <span className="font-medium text-[#1A1A1A]">
                        チャネルアクセストークン（長期）
                      </span>
                      と
                      <span className="font-medium text-[#1A1A1A]">
                        チャネルシークレット
                      </span>
                      を入力してください。
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-[#1A1A1A]">
                      チャネルアクセストークン
                    </Label>
                    <Input
                      type="password"
                      placeholder="チャネルアクセストークンを貼り付け"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className={inputCls}
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-[#1A1A1A]">
                      チャネルシークレット
                    </Label>
                    <Input
                      type="password"
                      placeholder="チャネルシークレットを貼り付け"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      className={inputCls}
                      autoComplete="off"
                    />
                    <p className="text-xs text-[#999999]">
                      Webhook署名検証に使用します（友だち追加の自動検知に必要）
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || !token.trim()}
                    className="h-10 px-6 rounded-full bg-[#06C755] text-white hover:bg-[#05b04c] gap-2 disabled:opacity-60 shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        接続テスト中...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4" />
                        接続テスト＆保存
                      </>
                    )}
                  </Button>
                </form>
              </SectionCard>

              {/* Setup guide */}
              <SectionCard title="設定手順">
                <ol className="space-y-3 text-sm text-[#666666]">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#999999]">
                      1
                    </span>
                    <span>
                      <a
                        href="https://developers.line.biz/console/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#06C755] underline underline-offset-2 hover:no-underline"
                      >
                        LINE Developersコンソール
                      </a>
                      でMessaging APIチャネルを作成
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#999999]">
                      2
                    </span>
                    <span>
                      チャネルアクセストークン（長期）とチャネルシークレットを取得
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#999999]">
                      3
                    </span>
                    <span>上のフォームに貼り付けて接続テスト</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#999999]">
                      4
                    </span>
                    <span>
                      接続後に表示されるWebhook URLをLINE Developersに設定
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#999999]">
                      5
                    </span>
                    <span>
                      LINE公式アカウントを友だち追加 → フォロワー一覧から「通知先に設定」
                    </span>
                  </li>
                </ol>
              </SectionCard>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-[#E5E5E5] py-6 text-center text-xs text-[#999999] hidden sm:block">
        <p>&copy; 2026 プチイベント作成くん</p>
      </footer>
    </div>
  );
}
