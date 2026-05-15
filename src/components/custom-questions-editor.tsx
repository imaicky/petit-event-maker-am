"use client";

import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  type CustomQuestion,
  MAX_QUESTIONS,
  MAX_OPTIONS,
  MAX_LABEL_LEN,
  MAX_OPTION_LEN,
  QUESTION_TEMPLATES,
  generateQuestionId,
} from "@/lib/custom-questions";

/**
 * 主催者がイベント編集画面で「事前アンケート」を組み立てるエディタ。
 *
 * v1制約:
 * - 質問は最大3問
 * - 全項目「任意回答」(必須化フラグなし)
 * - タイプは「単一選択」or「自由記述」のみ（複数選択はv2）
 */
export function CustomQuestionsEditor({
  value,
  onChange,
}: {
  value: CustomQuestion[];
  onChange: (next: CustomQuestion[]) => void;
}) {
  const canAdd = value.length < MAX_QUESTIONS;

  function add(q: Omit<CustomQuestion, "id">) {
    if (!canAdd) return;
    onChange([...value, { ...q, id: generateQuestionId() }]);
  }
  function update(idx: number, patch: Partial<CustomQuestion>) {
    const next = value.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    onChange(next as CustomQuestion[]);
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#FAFAFA] p-3 ring-1 ring-[#E5E5E5]/70">
        <p className="text-[11px] text-[#666666] leading-relaxed">
          参加者の申込フォームに表示される任意質問を最大{MAX_QUESTIONS}問まで追加できます。
          すべて<strong>任意回答</strong>です（未回答でも申込可能）。
          回答は参加者一覧で集計されます。
        </p>
      </div>

      {/* テンプレートのワンクリック追加 */}
      {canAdd && (
        <div>
          <p className="mb-2 text-[11px] font-medium text-[#999999]">
            よくある質問テンプレ
          </p>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TEMPLATES.map((t) => {
              const alreadyAdded = value.some((q) => q.label === t.question.label);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => add(t.question)}
                  disabled={alreadyAdded}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs font-medium text-[#1A1A1A] hover:border-[#1A1A1A]/30 hover:bg-[#F7F7F7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 既存の質問リスト */}
      {value.length > 0 && (
        <ul className="space-y-3">
          {value.map((q, idx) => (
            <li
              key={q.id}
              className="rounded-2xl border border-[#E5E5E5] bg-white p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1A1A1A] px-2 text-[10px] font-bold text-white">
                  Q{idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded-md p-1 text-[#999999] hover:bg-[#F2F2F2] disabled:opacity-30"
                    aria-label="上に移動"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === value.length - 1}
                    className="rounded-md p-1 text-[#999999] hover:bg-[#F2F2F2] disabled:opacity-30"
                    aria-label="下に移動"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="rounded-md p-1 text-red-500 hover:bg-red-50"
                    aria-label="削除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-[#666666]">
                  質問文
                </span>
                <input
                  type="text"
                  value={q.label}
                  maxLength={MAX_LABEL_LEN}
                  onChange={(e) => update(idx, { label: e.target.value })}
                  placeholder="例：お弁当の希望を教えてください"
                  className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
                />
              </label>

              <div className="flex gap-2">
                <TypeButton
                  active={q.type === "select"}
                  onClick={() =>
                    update(idx, {
                      type: "select",
                      options: q.options ?? ["", ""],
                    })
                  }
                  label="選択肢から選ぶ"
                />
                <TypeButton
                  active={q.type === "text"}
                  onClick={() =>
                    update(idx, { type: "text", options: undefined })
                  }
                  label="自由記述"
                />
              </div>

              {q.type === "select" && (
                <OptionsEditor
                  options={q.options ?? []}
                  onChange={(options) => update(idx, { options })}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* カスタム質問を空から追加 */}
      {canAdd && (
        <button
          type="button"
          onClick={() =>
            add({ label: "", type: "text" })
          }
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#1A1A1A]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          自由記述の質問を追加
        </button>
      )}

      {!canAdd && (
        <p className="text-[11px] text-[#999999]">
          質問は最大{MAX_QUESTIONS}問までです（追加するには既存の質問を削除してください）
        </p>
      )}
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-[#1A1A1A] px-3 py-1 text-[11px] font-medium text-white"
          : "rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-[11px] font-medium text-[#666666] hover:border-[#1A1A1A]/30"
      }
    >
      {label}
    </button>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (next: string[]) => void;
}) {
  function set(i: number, v: string) {
    onChange(options.map((o, idx) => (idx === i ? v : o)));
  }
  function addOption() {
    if (options.length >= MAX_OPTIONS) return;
    onChange([...options, ""]);
  }
  function removeOption(i: number) {
    if (options.length <= 2) return;
    onChange(options.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-[#666666]">
        選択肢（2〜{MAX_OPTIONS}個）
      </p>
      <ul className="space-y-1.5">
        {options.map((opt, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={opt}
              maxLength={MAX_OPTION_LEN}
              onChange={(e) => set(i, e.target.value)}
              placeholder={`選択肢 ${i + 1}`}
              className="flex-1 rounded-xl border border-[#E5E5E5] px-3 py-1.5 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              className="rounded-md p-1 text-[#999999] hover:bg-[#F2F2F2] disabled:opacity-30"
              aria-label="選択肢を削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {options.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={addOption}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-dashed border-[#E5E5E5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#666666] hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] transition-colors"
        >
          <Plus className="h-3 w-3" />
          選択肢を追加
        </button>
      )}
    </div>
  );
}
