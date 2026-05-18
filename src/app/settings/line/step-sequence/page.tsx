"use client";

/**
 * LINE ステップ配信シナリオ設定ページ
 *
 * 主催者ごとに1つのシナリオを持ち、申込から N 時間後に自動でLINE送信する
 * メッセージを複数登録できる。申込者本人がLINE紐付け済みのときに送信。
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  Clock,
  Send,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

type Sequence = {
  id: string;
  name: string;
  is_active: boolean;
};

type StepMessage = {
  id: string;
  offset_hours: number;
  body: string;
  sort_order: number;
  is_active: boolean;
};

const PRESETS: Array<{ offset_hours: number; label: string; hint: string }> = [
  { offset_hours: 0, label: "申込直後", hint: "ありがとうございました" },
  { offset_hours: 24, label: "1日後", hint: "準備物の案内" },
  { offset_hours: 72, label: "3日後", hint: "再リマインド" },
  { offset_hours: 168, label: "1週間後", hint: "イベント前最終案内" },
];

function offsetLabel(h: number): string {
  if (h === 0) return "申込直後";
  if (h >= 24 && h % 24 === 0) return `${h / 24}日後`;
  return `${h}時間後`;
}

export default function StepSequencePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [messages, setMessages] = useState<StepMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingActive, setSavingActive] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOffset, setNewOffset] = useState<number | "">("");
  const [newBody, setNewBody] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/line/step-sequence");
      if (res.ok) {
        const json = await res.json();
        setSequence(json.sequence ?? null);
        setMessages((json.messages as StepMessage[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void fetchData();
  }, [user, fetchData]);

  const toggleActive = async () => {
    if (!sequence) return;
    setSavingActive(true);
    try {
      const res = await fetch("/api/line/step-sequence", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !sequence.is_active }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setSavingActive(false);
    }
  };

  const addMessage = async (offsetHours?: number, body?: string) => {
    const offset = offsetHours ?? (newOffset === "" ? null : Number(newOffset));
    const text = (body ?? newBody).trim();
    if (offset === null || isNaN(offset) || offset < 0) {
      setError("送信タイミング（時間）を入力してください");
      return;
    }
    if (!text) {
      setError("本文を入力してください");
      return;
    }
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/line/step-sequence/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offset_hours: offset, body: text }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "追加に失敗しました");
        return;
      }
      setNewOffset("");
      setNewBody("");
      setShowAddForm(false);
      await fetchData();
    } finally {
      setAdding(false);
    }
  };

  const removeMessage = async (id: string) => {
    if (!confirm("このステップを削除しますか？")) return;
    try {
      const res = await fetch(`/api/line/step-sequence/messages/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchData();
    } catch {
      setError("削除に失敗しました");
    }
  };

  if (authLoading || (loading && !sequence)) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        <Link
          href="/settings/line"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          LINE設定へ戻る
        </Link>

        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            <Send className="h-6 w-6" />
            ステップ配信
          </h1>
          <p className="mt-1 text-sm text-[#999999] leading-relaxed">
            申込から「N時間後」に自動でLINEメッセージを送信できます。
            申込者本人が「LINEで通知を受け取る」を登録していない方には届きません。
          </p>
        </div>

        {/* 有効/無効スイッチ */}
        {sequence && (
          <div className="mb-6 rounded-2xl bg-white border border-[#E5E5E5] p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755]/10">
              <Power className="h-5 w-5 text-[#06C755]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1A1A1A]">
                ステップ配信 {sequence.is_active ? "稼働中" : "停止中"}
              </p>
              <p className="text-xs text-[#999999]">
                オフにすると新規申込への自動送信を一時停止します
              </p>
            </div>
            <Switch
              checked={sequence.is_active}
              onCheckedChange={toggleActive}
              disabled={savingActive}
            />
          </div>
        )}

        {/* ステップ一覧 */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">
            ステップメッセージ（{messages.length} 件）
          </h2>
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-white p-6 text-center">
              <p className="text-sm text-[#999999]">
                まだステップがありません。下の「ステップを追加」から登録してください。
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {messages
                .slice()
                .sort((a, b) => a.offset_hours - b.offset_hours)
                .map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl bg-white border border-[#E5E5E5] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#06C755]/10">
                        <Clock className="h-4 w-4 text-[#06C755]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1A1A1A]">
                          申込から {offsetLabel(m.offset_hours)}
                        </p>
                        <p className="mt-1 text-sm text-[#666666] whitespace-pre-wrap leading-relaxed">
                          {m.body}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMessage(m.id)}
                        className="h-8 w-8 rounded-xl text-[#999999] hover:bg-red-50 hover:text-red-500 flex items-center justify-center shrink-0"
                        aria-label="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* プリセットからすぐ追加 */}
        <div className="mb-4 rounded-2xl bg-white border border-[#E5E5E5] p-4">
          <p className="text-xs font-medium text-[#666666] mb-2">
            ✨ プリセットから素早く追加
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p) => {
              const exists = messages.some(
                (m) => m.offset_hours === p.offset_hours
              );
              return (
                <button
                  key={p.offset_hours}
                  type="button"
                  onClick={() => {
                    setNewOffset(p.offset_hours);
                    setNewBody(`【${p.hint}】\n`);
                    setShowAddForm(true);
                  }}
                  disabled={exists}
                  className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-left hover:border-[#1A1A1A]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={exists ? "既に登録済み" : ""}
                >
                  <p className="text-xs font-bold text-[#1A1A1A]">{p.label}</p>
                  <p className="text-[10px] text-[#999999]">{p.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 追加フォーム */}
        {showAddForm ? (
          <div className="rounded-2xl bg-white border-2 border-dashed border-[#1A1A1A]/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[#1A1A1A]">
                新しいステップを追加
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewOffset("");
                  setNewBody("");
                  setError("");
                }}
                className="text-xs text-[#999999] hover:text-[#1A1A1A]"
              >
                キャンセル
              </button>
            </div>
            <div>
              <Label className="text-xs font-medium text-[#666666]">
                送信タイミング（申込から何時間後）
              </Label>
              <Input
                type="number"
                min={0}
                value={newOffset}
                onChange={(e) =>
                  setNewOffset(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="例: 24"
                className="h-10 rounded-xl border-[#E5E5E5]"
              />
              <p className="mt-1 text-[10px] text-[#999999]">
                24=1日後, 72=3日後, 168=1週間後
              </p>
            </div>
            <div>
              <Label className="text-xs font-medium text-[#666666]">
                メッセージ本文
              </Label>
              <Textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="申込者本人のLINEに届くメッセージ"
                className="rounded-xl border-[#E5E5E5] resize-none text-sm"
              />
              <p className="mt-1 text-[10px] text-[#999999] text-right">
                {newBody.length}/500
              </p>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <Button
              type="button"
              onClick={() => addMessage()}
              disabled={adding}
              className="w-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-2"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              ステップを追加
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="w-full h-11 rounded-xl border-dashed border-[#1A1A1A]/30 text-sm font-medium gap-2"
          >
            <Plus className="h-4 w-4" />
            カスタムでステップを追加
          </Button>
        )}

        {/* 注意書き */}
        <div className="mt-8 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>注意：</strong>
            申込者がThanksページで「LINEで通知を受け取る」を完了している方のみに届きます。
            未紐付けの方には届かないため、メール通知も併用してください。
            <br />
            また cron は1日1回（JST 9:00頃）動作するため、最小粒度は約24時間です。
          </p>
        </div>
      </main>
    </div>
  );
}
