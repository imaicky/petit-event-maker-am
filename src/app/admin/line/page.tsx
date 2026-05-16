"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  Shield,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Bell,
  BellOff,
  MessageSquare,
  Settings,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

type HealthRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  channel_name: string | null;
  has_token: boolean;
  has_secret: boolean;
  has_owner: boolean;
  notify_count: number;
  notify_on_booking: boolean;
  is_active: boolean;
  last_webhook_event_at: string | null;
  last_webhook_error: string | null;
  last_webhook_signature_failed_at: string | null;
  status: "ok" | "warning" | "critical";
  status_reasons: string[];
};

type HealthSummary = {
  total: number;
  ok: number;
  warning: number;
  critical: number;
};

export default function AdminLinePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [rows, setRows] = useState<HealthRow[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/line/health", { cache: "no-store" });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setSummary(json.summary);
        setRows(json.rows ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchHealth();
  }, [user, fetchHealth]);

  if (authLoading || !user) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-2xl bg-white border border-red-100 p-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <p className="text-base font-semibold text-[#1A1A1A]">
              このページは管理者専用です
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        <Link
          href="/settings/profile"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          プロフィール設定へ戻る
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <Shield className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1A1A]">
                LINE連携ヘルスレポート
              </h1>
              <p className="text-sm text-[#999999] mt-0.5">
                全ユーザーのLINE通知設定状況を一覧。問題のあるアカウントを早期発見できます。
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fetchHealth()}
            disabled={refreshing}
            className="h-9 rounded-full border-[#E5E5E5] gap-1.5 text-xs shrink-0"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            更新
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
          </div>
        ) : (
          <>
            {/* サマリー */}
            {summary && (
              <div className="grid grid-cols-4 gap-3 mb-6">
                <SummaryCard label="全体" count={summary.total} tone="neutral" />
                <SummaryCard label="OK" count={summary.ok} tone="ok" />
                <SummaryCard label="警告" count={summary.warning} tone="warning" />
                <SummaryCard label="重大" count={summary.critical} tone="critical" />
              </div>
            )}

            {/* マイグレーション未適用警告 */}
            {rows.length > 0 && rows.every((r) => !r.last_webhook_event_at) && (
              <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50/70 p-4">
                <p className="text-sm font-bold text-red-700 mb-1">
                  ⚠ 全アカウントでwebhook受信履歴がNULL
                </p>
                <p className="text-xs text-red-700/80 leading-relaxed">
                  マイグレーション `20260517000000_line_diagnostics.sql` が本番DBに未適用の可能性があります。
                  Supabase SQL Editor で適用してください。
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                    <tr>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999999]">状態</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999999]">ユーザー</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999999]">公式アカウント</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999999]">Secret</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999999]">通知先</th>
                      <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999999]">通知ON</th>
                      <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999999]">最終webhook</th>
                      <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#999999]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.user_id} className="border-b border-[#F2F2F2] last:border-b-0">
                        <td className="px-4 py-3">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate max-w-[180px]">
                            {r.display_name || r.username || "—"}
                          </p>
                          {r.username && r.display_name && (
                            <p className="text-[10px] text-[#999999] truncate max-w-[180px]">
                              @{r.username}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-[#666666] truncate max-w-[160px]">
                            {r.channel_name || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.has_secret ? (
                            <CheckCircle2 className="h-4 w-4 text-[#06C755] mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium ${r.notify_count > 0 || r.has_owner ? "text-[#06C755]" : "text-red-500"}`}>
                            {r.notify_count}
                            {r.has_owner && r.notify_count === 0 ? " (owner)" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.notify_on_booking ? (
                            <Bell className="h-4 w-4 text-[#06C755] mx-auto" />
                          ) : (
                            <BellOff className="h-4 w-4 text-[#999999] mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[11px] text-[#666666]">
                            {r.last_webhook_event_at
                              ? new Date(r.last_webhook_event_at).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })
                              : "未受信"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/settings/line?target_user_id=${r.user_id}`}
                            className="inline-flex items-center gap-1 text-xs text-[#06C755] hover:underline"
                          >
                            <Settings className="h-3 w-3" />
                            設定
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#999999]">
                          <MessageSquare className="h-8 w-8 text-[#E5E5E5] mx-auto mb-2" />
                          LINE連携済みのユーザーはまだいません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 警告詳細 */}
            {rows.some((r) => r.status !== "ok") && (
              <div className="mt-6 space-y-3">
                <h2 className="text-sm font-bold text-[#1A1A1A]">対処が必要なアカウント</h2>
                {rows.filter((r) => r.status !== "ok").map((r) => (
                  <div
                    key={r.user_id}
                    className={`rounded-xl border p-4 ${
                      r.status === "critical"
                        ? "border-red-200 bg-red-50/50"
                        : "border-amber-200 bg-amber-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {r.display_name || r.username || "—"} · {r.channel_name}
                      </p>
                      <Link
                        href={`/settings/line?target_user_id=${r.user_id}`}
                        className="text-xs text-[#06C755] hover:underline shrink-0"
                      >
                        代理設定 →
                      </Link>
                    </div>
                    <ul className="space-y-0.5">
                      {r.status_reasons.map((reason, i) => (
                        <li key={i} className="text-xs text-[#666666]">
                          • {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "neutral" | "ok" | "warning" | "critical";
}) {
  const cls =
    tone === "ok"
      ? "border-[#06C755]/20 bg-[#06C755]/5 text-[#06C755]"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "critical"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-[#E5E5E5] bg-white text-[#1A1A1A]";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}

function StatusPill({ status }: { status: "ok" | "warning" | "critical" }) {
  const cls =
    status === "ok"
      ? "bg-[#06C755]/10 text-[#06C755]"
      : status === "warning"
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";
  const label = status === "ok" ? "OK" : status === "warning" ? "警告" : "重大";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}
