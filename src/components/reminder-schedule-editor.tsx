"use client";

/**
 * リマインダースケジュールエディタ
 *
 * イベントに対して「1週間前」「3日前」「1日前」「当日朝」など複数の
 * リマインドタイミングを設定する。各イベントで個別に on/off + カスタム時間。
 *
 * 親フォーム（編集ページ）が `value` と `onChange` を渡し、state は親側で
 * 管理する。送信履歴は別途 API から取ってきて表示。
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Plus, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ReminderScheduleEntry = { offset_hours: number };

const PRESETS: Array<{ offset_hours: number; label: string; hint?: string }> = [
  { offset_hours: 168, label: "1週間前", hint: "予定を空けてもらう" },
  { offset_hours: 72, label: "3日前", hint: "準備物の案内" },
  { offset_hours: 48, label: "2日前" },
  { offset_hours: 24, label: "1日前", hint: "推奨" },
  { offset_hours: 6, label: "6時間前" },
  { offset_hours: 3, label: "3時間前", hint: "当日アナウンス" },
];

type SendHistory = {
  offset_hours: number;
  sent_at: string;
  recipient_count: number;
  channel: string;
};

interface Props {
  eventId: string;
  value: ReminderScheduleEntry[];
  onChange: (next: ReminderScheduleEntry[]) => void;
  eventDatetime: string;
}

function formatOffsetLabel(h: number): string {
  if (h === 168) return "1週間前";
  if (h === 72) return "3日前";
  if (h === 48) return "2日前";
  if (h === 24) return "1日前";
  if (h === 6) return "6時間前";
  if (h === 3) return "3時間前";
  if (h >= 24 && h % 24 === 0) return `${h / 24}日前`;
  return `${h}時間前`;
}

export function ReminderScheduleEditor({
  eventId,
  value,
  onChange,
  eventDatetime,
}: Props) {
  const [customHours, setCustomHours] = useState<string>("");
  const [history, setHistory] = useState<SendHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/reminders`);
        if (res.ok && !cancelled) {
          const json = await res.json();
          setHistory((json.history as SendHistory[]) ?? []);
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const offsets = new Set(value.map((v) => v.offset_hours));

  const togglePreset = (h: number) => {
    if (offsets.has(h)) {
      onChange(value.filter((v) => v.offset_hours !== h));
    } else {
      onChange(
        [...value, { offset_hours: h }].sort(
          (a, b) => b.offset_hours - a.offset_hours
        )
      );
    }
  };

  const addCustom = () => {
    const n = Number(customHours);
    if (!Number.isFinite(n) || n <= 0 || n > 24 * 60) return;
    const h = Math.floor(n);
    if (offsets.has(h)) {
      setCustomHours("");
      return;
    }
    onChange(
      [...value, { offset_hours: h }].sort(
        (a, b) => b.offset_hours - a.offset_hours
      )
    );
    setCustomHours("");
  };

  const remove = (h: number) => {
    onChange(value.filter((v) => v.offset_hours !== h));
  };

  // 送信予定時刻を計算
  const scheduledTimeOf = (offsetHours: number): Date | null => {
    if (!eventDatetime) return null;
    return new Date(
      new Date(eventDatetime).getTime() - offsetHours * 60 * 60 * 1000
    );
  };

  const sentMap = new Map<number, SendHistory>();
  for (const h of history) sentMap.set(h.offset_hours, h);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
        <Bell className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 leading-relaxed">
          選択したタイミングで、確定参加者にメール（および本人がLINE紐付け済みならLINE）でリマインドを自動送信します。
          設定なしの場合は「1日前」と「3時間前」がデフォルトです。
        </p>
      </div>

      {/* プリセット */}
      <div>
        <Label className="text-xs font-medium text-[#666666] mb-2 block">
          プリセット（チェックでON/OFF）
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const checked = offsets.has(p.offset_hours);
            return (
              <button
                key={p.offset_hours}
                type="button"
                onClick={() => togglePreset(p.offset_hours)}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                  checked
                    ? "border-[#1A1A1A] bg-[#F7F7F7]"
                    : "border-[#E5E5E5] bg-white hover:border-[#1A1A1A]/40"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    checked
                      ? "border-[#1A1A1A] bg-[#1A1A1A]"
                      : "border-[#CCCCCC]"
                  }`}
                >
                  {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A]">{p.label}</p>
                  {p.hint && (
                    <p className="text-[10px] text-[#999999]">{p.hint}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* カスタム */}
      <div>
        <Label className="text-xs font-medium text-[#666666] mb-2 block">
          カスタム（開催からN時間前を追加）
        </Label>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            value={customHours}
            onChange={(e) => setCustomHours(e.target.value)}
            placeholder="例: 12"
            className="h-10 rounded-xl border-[#E5E5E5] flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addCustom}
            disabled={!customHours || Number(customHours) <= 0}
            className="h-10 rounded-xl gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            追加
          </Button>
        </div>
      </div>

      {/* 設定中一覧（送信予定/履歴） */}
      <div>
        <Label className="text-xs font-medium text-[#666666] mb-2 block">
          設定中のリマインダー（{value.length} 件）
        </Label>
        {value.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-4 text-center">
            <p className="text-xs text-[#999999]">
              設定なし。空のまま保存すると既定（1日前 + 3時間前）になります。
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {value
              .slice()
              .sort((a, b) => b.offset_hours - a.offset_hours)
              .map((entry) => {
                const sent = sentMap.get(entry.offset_hours);
                const scheduledAt = scheduledTimeOf(entry.offset_hours);
                const isPast = scheduledAt
                  ? scheduledAt.getTime() < Date.now()
                  : false;
                return (
                  <li
                    key={entry.offset_hours}
                    className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5"
                  >
                    <Clock className="h-4 w-4 text-[#999999] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {formatOffsetLabel(entry.offset_hours)}
                      </p>
                      <p className="text-[11px] text-[#999999] leading-snug">
                        {sent ? (
                          <>
                            ✅ {new Date(sent.sent_at).toLocaleString("ja-JP", {
                              timeZone: "Asia/Tokyo",
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            に送信済み（{sent.recipient_count}件 /{" "}
                            {sent.channel}）
                          </>
                        ) : scheduledAt ? (
                          <>
                            {isPast ? "⏳ 次回cron時に送信" : "📅 送信予定: "}
                            {!isPast &&
                              scheduledAt.toLocaleString("ja-JP", {
                                timeZone: "Asia/Tokyo",
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                          </>
                        ) : (
                          "開催日時未設定"
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(entry.offset_hours)}
                      className="h-7 w-7 rounded-full text-[#999999] hover:bg-red-50 hover:text-red-500 flex items-center justify-center shrink-0"
                      aria-label="削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
        {!loadingHistory && history.length > 0 && (
          <p className="mt-2 text-[10px] text-[#999999]">
            ※ 送信履歴は最新の cron 実行後に反映されます
          </p>
        )}
      </div>
    </div>
  );
}
