"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Plus } from "lucide-react";
import Link from "next/link";

type Suggestion = {
  title: string;
  rationale: string;
  category_name: string | null;
  audience_match: number;
};

type Props = {
  eventId: string;
};

export function SyllabusSuggester({ eventId }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/syllabus-suggest`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "提案の生成に失敗しました");
        return;
      }
      const j = await res.json();
      setSuggestions(Array.isArray(j.suggestions) ? j.suggestions : []);
    } catch {
      setError("ネットワークエラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-[#E5E5E5] bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
          <Lightbulb className="h-3.5 w-3.5" />
          次回イベントの提案
        </h2>
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Lightbulb className="h-3 w-3" />
          )}
          {suggestions ? "再生成" : "提案を生成"}
        </button>
      </div>

      <p className="mb-4 text-xs text-[#666666]">
        参加者の他カテゴリ嗜好＋AIレベル分布から、次に企画すると効果的なテーマを提案します
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {suggestions && suggestions.length === 0 && (
        <p className="py-3 text-sm text-[#999999]">
          提案できるデータがまだありません（参加者数が0、または参加履歴データ不足）
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <ul className="space-y-3">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#1A1A1A]">{s.title}</p>
                {s.audience_match > 0 && (
                  <span className="shrink-0 rounded-full bg-[#1A1A1A] px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                    マッチ {Math.round(s.audience_match * 100)}%
                  </span>
                )}
              </div>
              <p className="mb-2 text-xs leading-relaxed text-[#666666]">
                {s.rationale}
              </p>
              {s.category_name && (
                <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] text-[#666666] ring-1 ring-[#E5E5E5]">
                  {s.category_name}
                </span>
              )}
              <div className="mt-3">
                <Link
                  href={`/events/new?title=${encodeURIComponent(s.title)}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1A1A1A] hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  このテーマでイベントを作る
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
