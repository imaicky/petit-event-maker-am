"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";

type Suggestion = { title: string; why: string };

/**
 * イベント作成画面のタイトル欄横に出すAI候補ジェネレーター。
 *
 * description が一定長になったら有効化、ボタンクリックで Claude に問い合わせ、
 * 3つの方向性違いのタイトル案を表示。クリックでタイトル欄に転送。
 */
export function AITitleSuggestions({
  description,
  category,
  onApply,
}: {
  description: string;
  category?: string | null;
  onApply: (title: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);

  const ready = description.trim().length >= 20;

  async function generate() {
    if (!ready) {
      setError("先に説明文を 20 文字以上入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestions([]);
    setAppliedIdx(null);
    try {
      const res = await fetch("/api/ai/title-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "AI生成に失敗しました");
        return;
      }
      setSuggestions(json.suggestions ?? []);
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={generate}
        disabled={loading || !ready}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#C26A4A]/30 bg-[#FAF1ED] px-3 py-1.5 text-xs font-medium text-[#A85535] hover:bg-[#F5E0D5] hover:border-[#C26A4A]/50 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        AIタイトル候補を生成
      </button>

      {!ready && !error && (
        <p className="mt-1 text-[10px] text-[#999999]">
          先に説明文を 20 文字以上入力すると生成できます
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      {suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1A1A1A] break-words">
                    {s.title}
                  </p>
                  <p className="mt-1 text-[11px] text-[#999999] leading-relaxed">
                    💡 {s.why}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onApply(s.title);
                    setAppliedIdx(idx);
                  }}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    appliedIdx === idx
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[#1A1A1A] text-white hover:bg-[#404040]"
                  }`}
                >
                  {appliedIdx === idx ? (
                    <>
                      <Check className="h-3 w-3" />
                      適用済
                    </>
                  ) : (
                    "使う"
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
