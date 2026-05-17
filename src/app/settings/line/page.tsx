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
  BookOpen,
  Shield,
  ChevronDown,
  Stethoscope,
  ShieldAlert,
  UserPlus,
  Send,
  RefreshCw,
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

type AdminUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  line_connected: boolean;
  line_channel_name: string | null;
};

type DiagnoseResult = {
  channel: {
    has_token: boolean;
    has_secret: boolean;
    bot_info_ok: boolean;
    bot_user_id: string | null;
    bot_basic_id: string | null;
    channel_name: string | null;
  };
  webhook: {
    last_event_at: string | null;
    last_error: string | null;
    last_signature_failed_at: string | null;
  };
  recipients: {
    owner: string | null;
    notify_count: number;
    notify_ids: string[];
    notify_on_booking: boolean;
  };
  warnings: string[];
};

const LINE_USER_ID_RE = /^U[0-9a-fA-F]{32}$/;

const inputCls =
  "h-10 rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA]";

function FollowerAvatar({
  pictureUrl,
  displayName,
  size = 36,
}: {
  pictureUrl: string | null;
  displayName: string | null;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const initial = (displayName ?? "?").trim().charAt(0).toUpperCase();
  if (!pictureUrl || errored) {
    return (
      <div
        className="rounded-full bg-[#E5E5E5] flex items-center justify-center shrink-0 text-[#666666] font-semibold"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      >
        {initial !== "" ? initial : <Users className="h-4 w-4 text-[#999999]" />}
      </div>
    );
  }
  return (
    <Image
      src={pictureUrl}
      alt={displayName ?? ""}
      width={size}
      height={size}
      className="rounded-full shrink-0 object-cover"
      onError={() => setErrored(true)}
      unoptimized
    />
  );
}

function DiagnoseRow({
  label,
  ok,
  warn,
  sublabel,
}: {
  label: string;
  ok: boolean;
  warn?: boolean;
  sublabel: string;
}) {
  const tone = !ok ? "red" : warn ? "amber" : "green";
  const bgCls =
    tone === "red"
      ? "bg-red-50 border-red-100"
      : tone === "amber"
      ? "bg-amber-50 border-amber-100"
      : "bg-[#06C755]/5 border-[#06C755]/15";
  const textCls =
    tone === "red"
      ? "text-red-700"
      : tone === "amber"
      ? "text-amber-700"
      : "text-[#06C755]";
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${bgCls}`}>
      <div className="flex items-center gap-2 min-w-0">
        {tone === "red" ? (
          <X className="h-4 w-4 text-red-600 shrink-0" />
        ) : tone === "amber" ? (
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
        ) : (
          <Check className="h-4 w-4 text-[#06C755] shrink-0" />
        )}
        <span className="text-sm font-medium text-[#1A1A1A] truncate">{label}</span>
      </div>
      <span className={`text-xs ${textCls} truncate text-right`}>{sublabel}</span>
    </div>
  );
}

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
  const [botBasicId, setBotBasicId] = useState<string | null>(null);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [settingOwner, setSettingOwner] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // 通知先 (notify_line_user_ids) 直接編集
  const [notifyIds, setNotifyIds] = useState<string[]>([]);
  const [newRecipientId, setNewRecipientId] = useState("");
  const [addingRecipient, setAddingRecipient] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [testPushing, setTestPushing] = useState(false);

  // 連携診断
  const [diagnose, setDiagnose] = useState<DiagnoseResult | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

  // 上級者向け（直接ID入力）アコーディオン
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const targetQuery = targetUserId ? `?target_user_id=${targetUserId}` : "";
  const selectedUser = adminUsers.find((u) => u.id === targetUserId);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Check admin status and fetch user list
  const refreshAdminUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.isAdmin) {
          setIsAdmin(true);
          setAdminUsers(json.users ?? []);
        }
      }
    } catch {
      // not admin, ignore
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshAdminUsers();
  }, [user, refreshAdminUsers]);

  // Fetch existing LINE account
  const fetchLineAccount = useCallback(async () => {
    try {
      const res = await fetch(`/api/line${targetUserId ? `?target_user_id=${targetUserId}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        setLineAccount(json.lineAccount ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  // Fetch followers
  const fetchFollowers = useCallback(async () => {
    setFollowersLoading(true);
    try {
      const res = await fetch(`/api/line/followers${targetUserId ? `?target_user_id=${targetUserId}` : ""}`);
      if (res.ok) {
        const json = await res.json();
        setFollowers(json.followers ?? []);
        setOwnerLineUserId(json.owner_line_user_id ?? null);
        setBotBasicId(json.bot_basic_id ?? null);
      }
    } catch {
      // ignore
    } finally {
      setFollowersLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      setLineAccount(null);
      setFollowers([]);
      fetchLineAccount();
    }
  }, [user, fetchLineAccount]);

  useEffect(() => {
    if (lineAccount) fetchFollowers();
  }, [lineAccount, fetchFollowers]);

  // 診断結果を取得（notify_ids / has_secret などはこれが正）
  const runDiagnose = useCallback(
    async (silent = false) => {
      if (!silent) setDiagnosing(true);
      try {
        const res = await fetch("/api/line/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetUserId ? { target_user_id: targetUserId } : {}),
        });
        if (res.ok) {
          const json = (await res.json()) as DiagnoseResult;
          setDiagnose(json);
          setNotifyIds(json.recipients.notify_ids);
        }
      } catch {
        // ignore
      } finally {
        if (!silent) setDiagnosing(false);
      }
    },
    [targetUserId]
  );

  useEffect(() => {
    if (lineAccount) runDiagnose(true);
  }, [lineAccount, runDiagnose]);

  // LINE Login OAuth コールバック後のトースト表示
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const ok = sp.get("line_link_ok");
    const err = sp.get("line_link_error");
    const name = sp.get("line_link_name");
    const pushWarn = sp.get("line_link_push_warn");
    if (ok) {
      const who = name ? `${decodeURIComponent(name)} さん` : "あなたのLINE";
      if (ok === "already") {
        showSuccess(`${who} はすでに通知先に登録されています`);
      } else if (pushWarn) {
        setErrorMsg(
          `${who} を通知先に登録しましたが、テスト通知が届きませんでした。公式アカウントを「友だち追加」してください。`
        );
      } else {
        showSuccess(`${who} を通知先に登録しました。LINEにテスト通知を送信しました`);
      }
      // パラメータを履歴から消す
      const url = new URL(window.location.href);
      url.searchParams.delete("line_link_ok");
      url.searchParams.delete("line_link_error");
      url.searchParams.delete("line_link_name");
      url.searchParams.delete("line_link_push_warn");
      window.history.replaceState({}, "", url.toString());
      // 通知先一覧を最新化
      if (lineAccount) runDiagnose(true);
    } else if (err) {
      const msg =
        err === "state_mismatch"
          ? "CSRF検証失敗。ブラウザを更新してやり直してください。"
          : err === "no_line_account"
          ? "LINE連携が未設定のため通知先を登録できません。"
          : err === "forbidden"
          ? "この操作の権限がありません。"
          : err === "token_exchange_failed"
          ? "LINE認証に失敗しました。LINEログインチャネルの設定を確認してください。"
          : `LINE連携エラー: ${err}`;
      setErrorMsg(msg);
      const url = new URL(window.location.href);
      url.searchParams.delete("line_link_error");
      window.history.replaceState({}, "", url.toString());
    }
    // 初回マウント時のみ評価する（依存配列に searchParams を入れない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = newRecipientId.trim();
    if (!id) return;
    if (!LINE_USER_ID_RE.test(id)) {
      setErrorMsg("LINEユーザーIDは U で始まる33文字の英数字です（例: U1234567890abcdef1234567890abcdef）");
      return;
    }
    setAddingRecipient(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line/notify-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          line_user_id: id,
          ...(targetUserId ? { target_user_id: targetUserId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "追加に失敗しました");
        return;
      }
      setNotifyIds(json.notify_line_user_ids ?? []);
      if (json.owner_line_user_id !== undefined) {
        setOwnerLineUserId(json.owner_line_user_id);
      }
      setNewRecipientId("");
      showSuccess(json.already_registered ? "すでに登録済みです" : "通知先を追加しました。テストメッセージがLINEに届きます");
      // 状態を完全に同期
      runDiagnose(true);
    } catch {
      setErrorMsg("追加に失敗しました。もう一度お試しください。");
    } finally {
      setAddingRecipient(false);
    }
  };

  // 「プロフィール未取得」表示の通知先について、LINE Bot API からプロフィールを
  // 再取得して line_followers に upsert する。lineUserId 省略時は未取得の全件を一括更新。
  const [refreshingProfileId, setRefreshingProfileId] = useState<string | "ALL" | null>(null);
  const handleRefreshProfile = async (lineUserId?: string) => {
    setRefreshingProfileId(lineUserId ?? "ALL");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line/notify-recipients/refresh-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(lineUserId ? { line_user_id: lineUserId } : {}),
          ...(targetUserId ? { target_user_id: targetUserId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "プロフィール取得に失敗しました");
        return;
      }
      const results = (json.results ?? []) as Array<{
        line_user_id: string;
        ok: boolean;
        display_name?: string | null;
        error?: string;
      }>;
      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      // フォロワー一覧を再フェッチして表示を反映
      await fetchFollowers();
      if (results.length === 0) {
        showSuccess("プロフィール未取得の通知先はありません");
      } else if (failCount === 0) {
        showSuccess(`プロフィールを更新しました（${okCount}件）`);
      } else if (okCount === 0) {
        setErrorMsg(
          `取得できませんでした（${failCount}件）。公式アカウントを友だち追加していないか、ブロックされている可能性があります。`
        );
      } else {
        showSuccess(`更新${okCount}件 / 取得失敗${failCount}件`);
      }
    } catch {
      setErrorMsg("プロフィール取得に失敗しました");
    } finally {
      setRefreshingProfileId(null);
    }
  };

  const handleRemoveRecipient = async (lineUserId: string) => {
    setRemovingId(lineUserId);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line/notify-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          line_user_id: lineUserId,
          skip_preflight: true,
          ...(targetUserId ? { target_user_id: targetUserId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "削除に失敗しました");
        return;
      }
      setNotifyIds(json.notify_line_user_ids ?? []);
      if (json.owner_line_user_id !== undefined) {
        setOwnerLineUserId(json.owner_line_user_id);
      }
      showSuccess("通知先を削除しました");
      runDiagnose(true);
    } catch {
      setErrorMsg("削除に失敗しました");
    } finally {
      setRemovingId(null);
    }
  };

  const handleTestPush = async () => {
    setTestPushing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line/test-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: "all",
          ...(targetUserId ? { target_user_id: targetUserId } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "テスト送信に失敗しました");
        return;
      }
      const ok = (json.results ?? []).filter((r: { ok: boolean }) => r.ok).length;
      const fail = (json.results ?? []).filter((r: { ok: boolean }) => !r.ok).length;
      if (fail === 0) {
        showSuccess(`${ok}件すべてに送信成功しました。LINEを確認してください`);
      } else {
        setErrorMsg(`成功 ${ok}件 / 失敗 ${fail}件`);
      }
    } catch {
      setErrorMsg("テスト送信に失敗しました");
    } finally {
      setTestPushing(false);
    }
  };

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
      if (targetUserId) {
        payload.target_user_id = targetUserId;
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
      // Refresh the admin user list so the picker reflects the new linked status
      refreshAdminUsers();
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
      const res = await fetch(`/api/line${targetQuery}`, { method: "DELETE" });

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error || "解除に失敗しました");
        return;
      }

      setLineAccount(null);
      setFollowers([]);
      setOwnerLineUserId(null);
      showSuccess("LINE連携を解除しました");
      refreshAdminUsers();
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
        body: JSON.stringify({ notify_on_booking: checked, ...(targetUserId ? { target_user_id: targetUserId } : {}) }),
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
        body: JSON.stringify({ line_user_id: lineUserId, ...(targetUserId ? { target_user_id: targetUserId } : {}) }),
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

        {/* Admin user picker */}
        {isAdmin && (
          <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">管理者モード</span>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserPicker(!showUserPicker)}
                className="w-full flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm text-left hover:border-amber-400 transition-colors"
              >
                <span className="truncate">
                  {targetUserId
                    ? `${selectedUser?.display_name || selectedUser?.username || "ユーザー"} ${selectedUser?.line_connected ? "✅ LINE連携済" : "❌ 未連携"}`
                    : "自分のアカウント（デフォルト）"}
                </span>
                <ChevronDown className={`h-4 w-4 text-amber-600 shrink-0 transition-transform ${showUserPicker ? "rotate-180" : ""}`} />
              </button>
              {showUserPicker && (
                <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-amber-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setTargetUserId(null); setShowUserPicker(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors ${!targetUserId ? "bg-amber-50 font-medium" : ""}`}
                  >
                    自分のアカウント
                  </button>
                  {adminUsers.filter((u) => u.id !== user?.id).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setTargetUserId(u.id); setShowUserPicker(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors flex items-center justify-between ${targetUserId === u.id ? "bg-amber-50 font-medium" : ""}`}
                    >
                      <span className="truncate">{u.display_name || `@${u.username}` || u.id.slice(0, 8)}</span>
                      <span className={`text-xs shrink-0 ml-2 ${u.line_connected ? "text-green-600" : "text-gray-400"}`}>
                        {u.line_connected ? `✅ ${u.line_channel_name || "連携済"}` : "未連携"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {targetUserId && (
              <p className="mt-2 text-xs text-amber-600">
                {selectedUser?.display_name || selectedUser?.username} さんのLINE設定を管理中
              </p>
            )}
          </div>
        )}

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
          <div className="flex items-center gap-3 mt-2">
            <p className="text-sm text-[#999999]">
              LINE公式アカウントを連携すると、イベント作成時にフォロワーへ自動通知が送れます
            </p>
            <Link
              href="/settings/line/guide"
              className="shrink-0 inline-flex items-center gap-1 text-xs text-[#06C755] hover:underline underline-offset-2"
            >
              <BookOpen className="h-3 w-3" />
              ガイド
            </Link>
          </div>
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
              {/* ── 警告バナー: シークレット欠落 ── */}
              {diagnose && !diagnose.channel.has_secret && (
                <section className="rounded-2xl border-2 border-red-200 bg-red-50/70 overflow-hidden">
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-bold text-red-700">
                          チャネルシークレットが未設定です
                        </p>
                        <p className="text-xs text-red-700/80 leading-relaxed">
                          webhookの署名検証ができないため、友だち追加や「通知ON」コマンドが処理されません。
                          LINE Developers Console から **チャネルシークレット** を取得して再連携してください。
                        </p>
                        <a
                          href="https://developers.line.biz/console/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800 underline underline-offset-2 mt-1"
                        >
                          LINE Developers Console を開く →
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* ── 警告バナー: 通知先未設定 ── */}
              {diagnose && diagnose.channel.has_secret &&
                diagnose.recipients.notify_count === 0 &&
                !diagnose.recipients.owner && (
                <section className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 overflow-hidden">
                  <div className="p-5 space-y-2">
                    <div className="flex items-start gap-3">
                      <Bell className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-bold text-amber-900">
                          通知先が未設定です — このままだと予約があっても通知が届きません
                        </p>
                        <p className="text-xs text-amber-900/80 leading-relaxed">
                          下の <span className="font-semibold">「通知先（管理者LINE）」</span> セクションで、
                          自分のLINEユーザーIDを入力するか、公式アカウントを友だち追加した上でトーク画面で「通知ON」と送信してください。
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

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

              {/* Onboarding banner: prompt the owner to friend-add themselves */}
              {!ownerLineUserId && (
                <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 overflow-hidden">
                  <div className="px-6 py-4 border-b border-amber-200/60 bg-amber-100/40">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-700" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        通知を受け取る設定（必須）
                      </h2>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        まずあなた自身が公式アカウントを友だち追加してください
                      </p>
                      <p className="text-xs text-[#666666] leading-relaxed">
                        LINEの仕様上、公式アカウント自体には通知を表示できません。
                        予約通知を受け取るには、<span className="font-medium text-[#1A1A1A]">あなた個人のLINE</span>で
                        この公式アカウントを友だち追加し、通知先として登録する必要があります。
                      </p>
                    </div>

                    <ol className="space-y-3 text-sm text-[#333333]">
                      <li className="flex gap-3">
                        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">
                          1
                        </span>
                        <div className="flex-1 space-y-2">
                          <p>
                            スマホのLINEで「<span className="font-medium">{lineAccount.channel_name || "公式アカウント"}</span>」を友だち追加
                          </p>
                          {botBasicId ? (
                            <a
                              href={`https://line.me/R/ti/p/${botBasicId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-[#06C755] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#05B048] transition-colors"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              友だち追加リンクを開く
                            </a>
                          ) : (
                            <p className="text-xs text-[#999999]">
                              ※ Bot Basic IDが取得できていません。LINE Developersコンソールで Bot 設定を確認してください
                            </p>
                          )}
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">
                          2
                        </span>
                        <div className="flex-1 space-y-1">
                          <p>
                            友だち追加すると、下の<span className="font-medium">「フォロワー一覧」</span>にあなたが表示されます
                          </p>
                          <p className="text-xs text-[#666666]">
                            ※ 表示されない場合は、Webhook URLが LINE Developers コンソールに正しく設定されているか確認してください
                          </p>
                        </div>
                      </li>
                      <li className="flex gap-3">
                        <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">
                          3
                        </span>
                        <div className="flex-1 space-y-1">
                          <p>
                            自分の名前の横にある<span className="font-medium">「通知先に設定」</span>ボタンをタップ
                          </p>
                          <p className="text-xs text-[#666666]">
                            これで予約が入った時にあなたのLINEに直接通知が届くようになります
                          </p>
                        </div>
                      </li>
                    </ol>

                    <div className="flex items-start gap-2 rounded-xl bg-white/70 border border-amber-200/60 px-3 py-2.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-700 mt-0.5 shrink-0" />
                      <p className="text-xs text-[#666666] leading-relaxed">
                        複数の管理者で通知を共有したい場合は、各管理者がそれぞれ友だち追加し、トーク画面で「<span className="font-medium text-[#1A1A1A]">通知ON</span>」と送信してください。
                      </p>
                    </div>
                  </div>
                </section>
              )}

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

              {/* ─── 通知先（管理者LINE）── 大きく簡単に ──────────────── */}
              <SectionCard title="通知先を登録">
                <div className="space-y-4">
                  <div className="rounded-xl bg-[#06C755]/5 border border-[#06C755]/20 p-4 space-y-1.5">
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      🔔 通知を受け取る方法を選んでください（どれか1つでOK）
                    </p>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      下の<strong>3つの方法</strong>のいずれかで、あなたのLINEを通知先として登録できます。
                      最も簡単なのは <strong className="text-[#06C755]">方法A（LINEで本人確認）</strong>です。
                    </p>
                  </div>

                  {/* ─── 方法A: LINE Login（最推奨） ─── */}
                  <div className="rounded-2xl border-2 border-[#06C755] bg-[#06C755]/5 p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#06C755] text-white text-xs font-bold">
                        A
                      </span>
                      <p className="text-sm font-bold text-[#1A1A1A]">
                        LINEで本人確認して登録（推奨・最短）
                      </p>
                    </div>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      ボタンを押してLINEの認証画面でOKするだけ。ID入力もコマンド送信も不要です。
                      <span className="text-[10px] text-[#999999]">（事前に公式アカウントを友だち追加しておいてください）</span>
                    </p>
                    <a
                      href={`/api/auth/line/start${targetUserId ? `?target_user_id=${targetUserId}` : ""}`}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#06C755] hover:bg-[#05B048] text-white px-6 py-3 text-sm font-bold transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      LINEで本人確認して登録する
                    </a>
                  </div>

                  {/* ─── 方法B: 「通知ON」メッセージ ─── */}
                  <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#E5E5E5] text-[#666666] text-xs font-bold">
                        B
                      </span>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        公式アカウントに「通知ON」と送信
                      </p>
                    </div>
                    <ol className="text-xs text-[#666666] list-decimal pl-5 space-y-0.5 leading-relaxed">
                      <li>スマホのLINEで公式アカウント「<strong>{lineAccount.channel_name}</strong>」を開く</li>
                      <li>トーク画面に「<code className="bg-[#FAFAFA] border border-[#F2F2F2] rounded px-1 py-0.5">通知ON</code>」と送信</li>
                      <li>Botから「✅ 通知を有効化しました」が返ってきたら完了</li>
                    </ol>
                    {botBasicId && (
                      <a
                        href={`https://line.me/R/ti/p/${botBasicId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#06C755] hover:underline mt-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        公式アカウントを開く（友だち追加リンク）
                      </a>
                    )}
                  </div>

                  {/* ─── 方法C: 上級者向け 直接入力（折りたたみ） ─── */}
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#666666]"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                    />
                    上級者向け: LINEユーザーIDを直接入力 / フォロワー一覧から選ぶ
                  </button>

                  {/* 現在の通知先一覧（常に表示） */}
                  <div className="pt-2">
                    <p className="text-xs font-medium text-[#666666] mb-2">
                      現在の通知先 {notifyIds.length > 0 && <span className="text-[#06C755]">({notifyIds.length}件)</span>}
                    </p>
                  {notifyIds.length === 0 ? (
                    <div className="text-center py-4 rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA]">
                      <Bell className="h-6 w-6 text-[#E5E5E5] mx-auto mb-1" />
                      <p className="text-xs text-[#999999]">
                        まだ登録されていません
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifyIds.map((id) => {
                        const matched = followers.find((f) => f.line_user_id === id);
                        const isOwner = ownerLineUserId === id;
                        return (
                          <div
                            key={id}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                              isOwner
                                ? "border-[#06C755]/30 bg-[#06C755]/5"
                                : "border-[#F2F2F2] bg-[#FAFAFA]"
                            }`}
                          >
                            <FollowerAvatar
                              pictureUrl={matched?.picture_url ?? null}
                              displayName={matched?.display_name ?? null}
                              size={32}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1A1A1A] truncate">
                                {matched?.display_name ?? "（プロフィール未取得）"}
                              </p>
                              <p className="text-[10px] text-[#999999] truncate font-mono">
                                {id}
                              </p>
                            </div>
                            {isOwner && (
                              <span className="text-[10px] font-medium text-[#06C755] shrink-0 px-2 py-0.5 rounded-full bg-[#06C755]/10">
                                主通知先
                              </span>
                            )}
                            {!matched?.display_name && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleRefreshProfile(id)}
                                disabled={refreshingProfileId === id || refreshingProfileId === "ALL"}
                                title="プロフィールを再取得（友だち追加が前提）"
                                className="h-7 w-7 rounded-full border-[#06C755]/30 text-[#06C755] hover:bg-[#06C755]/10 shrink-0"
                              >
                                {refreshingProfileId === id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveRecipient(id)}
                              disabled={removingId === id}
                              className="h-7 w-7 rounded-full border-[#E5E5E5] shrink-0"
                            >
                              {removingId === id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3 text-[#999999]" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
                      {/* 未取得が複数あるときの一括取得ボタン */}
                      {notifyIds.some((id) => !followers.find((f) => f.line_user_id === id)?.display_name) && (
                        <button
                          type="button"
                          onClick={() => handleRefreshProfile()}
                          disabled={refreshingProfileId !== null}
                          className="w-full mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#06C755]/40 bg-[#06C755]/5 px-3 py-2 text-xs font-medium text-[#06C755] hover:bg-[#06C755]/10 disabled:opacity-50 transition-colors"
                        >
                          {refreshingProfileId === "ALL" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          プロフィール未取得をまとめて再取得
                        </button>
                      )}
                    </div>
                  )}
                  </div>

                  {/* テスト送信（通知先がある時のみ常時表示） */}
                  {notifyIds.length > 0 && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestPush}
                        disabled={testPushing}
                        className="h-9 rounded-full border-[#E5E5E5] gap-2 text-xs"
                      >
                        {testPushing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        登録済み全員にテスト通知を送る
                      </Button>
                    </div>
                  )}

                  {/* ── 上級者向け: 直接入力フォーム（折りたたみ） ── */}
                  {advancedOpen && (
                    <div className="mt-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3">
                      <p className="text-xs text-[#666666] leading-relaxed">
                        <strong>方法C</strong>: LINEユーザーID（<code className="bg-white border border-[#E5E5E5] rounded px-1 py-0.5 text-[10px]">U</code> から始まる33文字）を直接入力します。
                        Webhookログ・Botコマンド・LINE公式IDチェッカーなどから取得してください。
                      </p>
                      <form onSubmit={handleAddRecipient} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder="U で始まる33文字"
                            value={newRecipientId}
                            onChange={(e) => setNewRecipientId(e.target.value)}
                            className={`${inputCls} flex-1 font-mono text-xs bg-white`}
                            autoComplete="off"
                          />
                          <Button
                            type="submit"
                            disabled={addingRecipient || !newRecipientId.trim()}
                            className="h-10 px-4 rounded-full bg-[#06C755] text-white hover:bg-[#05b04c] gap-1.5 disabled:opacity-60"
                          >
                            {addingRecipient ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4" />
                                追加
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-[11px] text-[#999999]">
                          追加時にこのLINEへテストメッセージを送信します。届かない場合は「友だち追加」が完了していません。
                        </p>
                      </form>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* ─── 連携診断 ────────────────────────────────── */}
              <SectionCard title="連携診断">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Stethoscope className="h-4 w-4 text-[#666666] mt-0.5" />
                      <p className="text-xs text-[#666666] leading-relaxed">
                        トークン・シークレット・webhook受信・通知先設定の状態をチェックします
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => runDiagnose(false)}
                      disabled={diagnosing}
                      className="h-9 rounded-full border-[#E5E5E5] gap-1.5 text-xs shrink-0"
                    >
                      {diagnosing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Stethoscope className="h-3.5 w-3.5" />
                      )}
                      診断を実行
                    </Button>
                  </div>

                  {diagnose && (
                    <div className="space-y-2">
                      <DiagnoseRow
                        label="チャネルアクセストークン"
                        ok={diagnose.channel.has_token && diagnose.channel.bot_info_ok}
                        sublabel={diagnose.channel.has_token ? (diagnose.channel.bot_info_ok ? "有効" : "LINE API応答なし") : "未設定"}
                      />
                      <DiagnoseRow
                        label="チャネルシークレット"
                        ok={diagnose.channel.has_secret}
                        sublabel={diagnose.channel.has_secret ? "設定済み" : "未設定（webhook署名検証不可）"}
                      />
                      <DiagnoseRow
                        label="Webhook受信"
                        ok={!!diagnose.webhook.last_event_at}
                        warn={!!diagnose.webhook.last_event_at && Date.now() - new Date(diagnose.webhook.last_event_at).getTime() > 86400000}
                        sublabel={
                          diagnose.webhook.last_event_at
                            ? `最終: ${new Date(diagnose.webhook.last_event_at).toLocaleString("ja-JP")}`
                            : "未受信"
                        }
                      />
                      <DiagnoseRow
                        label="署名検証"
                        ok={!diagnose.webhook.last_signature_failed_at && diagnose.channel.has_secret}
                        warn={!!diagnose.webhook.last_signature_failed_at}
                        sublabel={
                          diagnose.webhook.last_signature_failed_at
                            ? `失敗あり: ${new Date(diagnose.webhook.last_signature_failed_at).toLocaleString("ja-JP")}`
                            : diagnose.channel.has_secret
                            ? "問題なし"
                            : "シークレット未設定"
                        }
                      />
                      <DiagnoseRow
                        label="通知先"
                        ok={diagnose.recipients.notify_count > 0 || !!diagnose.recipients.owner}
                        sublabel={`${diagnose.recipients.notify_count}件登録${diagnose.recipients.owner ? " / 主通知先あり" : ""}`}
                      />
                      <DiagnoseRow
                        label="新規予約のLINE通知"
                        ok={diagnose.recipients.notify_on_booking}
                        sublabel={diagnose.recipients.notify_on_booking ? "ON" : "OFF"}
                      />
                      {diagnose.webhook.last_error && (
                        <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-700">
                          <p className="font-medium mb-0.5">最終エラー</p>
                          <p className="leading-relaxed">{diagnose.webhook.last_error}</p>
                        </div>
                      )}
                      {diagnose.warnings.length > 0 && (
                        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 space-y-1">
                          <p className="text-xs font-medium text-amber-900">対処が必要な項目</p>
                          <ul className="space-y-1">
                            {diagnose.warnings.map((w, i) => (
                              <li key={i} className="text-xs text-amber-900/90 leading-relaxed">
                                • {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
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
                              <FollowerAvatar
                                pictureUrl={f.picture_url}
                                displayName={f.display_name}
                                size={36}
                              />
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

                  {/* Multi-admin notification opt-in instruction */}
                  <div className="rounded-xl bg-[#FFF9F5] border border-[#E5DFD5] p-4">
                    <p className="text-sm font-medium text-[#1A1A1A] mb-2">
                      🧑‍🤝‍🧑 他の管理者も通知を受け取れます
                    </p>
                    <p className="text-xs text-[#666666] leading-relaxed mb-2">
                      LINE公式アカウントの管理者が複数いる場合、各自の個人LINEから公式アカウントに「<span className="font-bold text-[#1A1A1A]">通知ON</span>」とメッセージを送ると通知先に追加されます。
                    </p>
                    <p className="text-xs text-[#666666] leading-relaxed">
                      停止するには「<span className="font-bold text-[#1A1A1A]">通知OFF</span>」と送信してください。
                    </p>
                    <p className="text-[10px] text-[#999999] mt-2">
                      ※ 事前に各管理者が公式アカウントを「友だち追加」している必要があります
                    </p>
                  </div>
                </div>
              </SectionCard>

              {/* Setup guide link */}
              <SectionCard title="セットアップガイド">
                <div className="space-y-3">
                  <p className="text-sm text-[#666666]">
                    LINE連携の手順を画像付きで詳しく解説しています。他の方にLINE連携を案内する際にもご活用ください。
                  </p>
                  <Link
                    href="/settings/line/guide"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#06C755]/10 text-[#06C755] text-sm font-medium hover:bg-[#06C755]/20 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    画像付きセットアップガイドを見る →
                  </Link>
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
              {/* Wizard CTA — recommended path for first-time setup */}
              <Link
                href="/settings/line/wizard"
                className="block rounded-2xl border-2 border-[#06C755]/30 bg-gradient-to-br from-[#06C755]/10 to-[#06C755]/5 hover:from-[#06C755]/15 hover:to-[#06C755]/10 transition-colors p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#06C755] text-white shrink-0">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#06C755] mb-1">
                      おすすめ
                    </p>
                    <h2 className="text-base font-bold text-[#1A1A1A]">
                      かんたんウィザードで連携する
                    </h2>
                    <p className="text-xs text-[#666666] mt-1 leading-relaxed">
                      4ステップに分けて1問ずつ案内。
                      貼り付けるだけで自動検証され、迷わず完了できます。
                    </p>
                  </div>
                  <div className="self-center text-[#06C755]">→</div>
                </div>
              </Link>

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
                      placeholder="チャネルシークレット（必須）を貼り付け"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      className={inputCls}
                      autoComplete="off"
                      required
                    />
                    <p className="text-xs text-red-600 font-medium">
                      ⚠ webhook署名検証に使用します。未入力だと友だち追加・通知ON コマンドが一切動きません。
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || !token.trim() || !secret.trim()}
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
                <Link
                  href="/settings/line/guide"
                  className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-[#06C755]/10 text-[#06C755] text-sm font-medium hover:bg-[#06C755]/20 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                  画像付きの詳しいセットアップガイドを見る →
                </Link>
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
