"use client";

import { ClipboardList } from "lucide-react";
import {
  type CustomQuestion,
  type CustomAnswers,
  MAX_ANSWER_LEN,
} from "@/lib/custom-questions";

/**
 * 参加者の申込フォーム下部に表示する任意アンケート。
 * 全項目「任意回答」: スキップ可、未回答でも申込完了。
 */
export function CustomQuestionsForm({
  questions,
  value,
  onChange,
}: {
  questions: CustomQuestion[];
  value: CustomAnswers;
  onChange: (next: CustomAnswers) => void;
}) {
  if (!questions || questions.length === 0) return null;

  function set(id: string, v: string) {
    const next = { ...value };
    if (!v || !v.trim()) {
      delete next[id];
    } else {
      next[id] = v;
    }
    onChange(next);
  }

  return (
    <section className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-[#666666]" />
        <h3 className="text-sm font-bold text-[#1A1A1A]">
          主催者からの質問
        </h3>
        <span className="rounded-full bg-[#E5E5E5]/80 px-2 py-0.5 text-[10px] font-medium text-[#666666]">
          任意回答
        </span>
      </div>
      <p className="text-[11px] text-[#999999] leading-relaxed">
        以下の質問への回答は任意です。回答すると主催者の準備に役立ちます。
      </p>

      <ul className="space-y-4">
        {questions.map((q) => (
          <li key={q.id}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#1A1A1A]">
                {q.label}
              </span>
              {q.type === "select" ? (
                <div className="flex flex-wrap gap-2">
                  {(q.options ?? []).map((opt) => {
                    const active = value[q.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => set(q.id, active ? "" : opt)}
                        className={
                          active
                            ? "rounded-full bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-white"
                            : "rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium text-[#666666] hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] transition-colors"
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={value[q.id] ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                  maxLength={MAX_ANSWER_LEN}
                  rows={2}
                  placeholder="任意で入力してください"
                  className="w-full rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
                />
              )}
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
