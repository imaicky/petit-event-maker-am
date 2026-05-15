"use client";

import { ClipboardList } from "lucide-react";
import { type CustomQuestion } from "@/lib/custom-questions";

type Booking = {
  status?: string | null;
  custom_answers?: Record<string, string> | null;
};

/**
 * 参加者一覧の上部に出す、事前アンケート集計サマリ。
 *
 * - select 型は選択肢別の人数を集計
 * - text 型は回答件数のみ表示（個別内容は参加者リストで確認）
 * - confirmed の予約者のみ集計対象（cancelled は除外）
 */
export function CustomAnswersSummary({
  questions,
  bookings,
}: {
  questions: CustomQuestion[];
  bookings: Booking[];
}) {
  if (!questions || questions.length === 0) return null;

  const active = bookings.filter((b) => b.status === "confirmed");
  const total = active.length;
  if (total === 0) return null;

  return (
    <section className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-[#666666]" />
        <h2 className="text-sm font-bold text-[#1A1A1A]">
          事前アンケート集計
        </h2>
        <span className="text-[10px] text-[#999999]">
          confirmed {total}名 が対象
        </span>
      </div>

      <ul className="space-y-4">
        {questions.map((q) => (
          <li key={q.id}>
            <p className="text-xs font-medium text-[#1A1A1A]">{q.label}</p>
            {q.type === "select" ? (
              <SelectBreakdown
                question={q}
                bookings={active}
                total={total}
              />
            ) : (
              <TextSummary question={q} bookings={active} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SelectBreakdown({
  question,
  bookings,
  total,
}: {
  question: CustomQuestion;
  bookings: Booking[];
  total: number;
}) {
  const counts = new Map<string, number>();
  let answered = 0;
  for (const b of bookings) {
    const v = b.custom_answers?.[question.id];
    if (typeof v === "string" && v) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
      answered += 1;
    }
  }
  const unanswered = total - answered;
  const options = question.options ?? [];

  return (
    <div className="mt-1.5 space-y-1.5">
      {options.map((opt) => {
        const n = counts.get(opt) ?? 0;
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        return (
          <div key={opt}>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[#1A1A1A]">{opt}</span>
              <span className="tabular-nums text-[#666666]">
                {n}名 <span className="text-[#999999]">({pct}%)</span>
              </span>
            </div>
            <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-[#F2F2F2]">
              <div
                className="h-full rounded-full bg-[#1A1A1A]/80"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      {unanswered > 0 && (
        <p className="text-[10px] text-[#999999]">
          未回答 {unanswered}名
        </p>
      )}
    </div>
  );
}

function TextSummary({
  question,
  bookings,
}: {
  question: CustomQuestion;
  bookings: Booking[];
}) {
  const answers = bookings
    .map((b) => b.custom_answers?.[question.id])
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (answers.length === 0) {
    return (
      <p className="mt-1 text-[11px] text-[#999999]">
        回答 0件（自由記述）
      </p>
    );
  }

  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[11px] text-[#666666] hover:text-[#1A1A1A]">
        回答 {answers.length}件（クリックで展開）
      </summary>
      <ul className="mt-2 space-y-1 pl-3">
        {answers.map((a, i) => (
          <li
            key={i}
            className="rounded-md bg-[#FAFAFA] px-2 py-1 text-[11px] text-[#333333] break-words"
          >
            {a}
          </li>
        ))}
      </ul>
    </details>
  );
}
