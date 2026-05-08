"use client";

import { useState } from "react";
import { Lightbulb, Loader2, Plus, Sparkles, Cpu } from "lucide-react";
import Link from "next/link";

type HeuristicSuggestion = {
  title: string;
  rationale: string;
  category_name: string | null;
  audience_match: number;
};

type AiSuggestion = {
  title: string;
  rationale: string;
  category: string | null;
  level: string;
  format: string;
  estimated_duration_min: number;
};

type Mode = "heuristic" | "ai";

type State =
  | { mode: "heuristic"; suggestions: HeuristicSuggestion[] }
  | { mode: "ai"; suggestions: AiSuggestion[] };

type Props = {
  eventId: string;
};

export function SyllabusSuggester({ eventId }: Props) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("ai");

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        mode === "ai"
          ? `/api/events/${eventId}/syllabus-ai`
          : `/api/events/${eventId}/syllabus-suggest`;
      const res = await fetch(endpoint);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "提案の生成に失敗しました");
        return;
      }
      if (mode === "ai") {
        setState({
          mode: "ai",
          suggestions: Array.isArray(j.suggestions) ? j.suggestions : [],
        });
      } else {
        setState({
          mode: "heuristic",
          suggestions: Array.isArray(j.suggestions) ? j.suggestions : [],
        });
      }
    } catch {
      setError("ネットワークエラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-[#E5E5E5] bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
          <Lightbulb className="h-3.5 w-3.5" />
          次回イベントの提案
        </h2>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="inline-flex rounded-full bg-[#F2F2F2] p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${
                mode === "ai"
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#666666]"
              }`}
              aria-pressed={mode === "ai"}
            >
              <Sparkles className="h-2.5 w-2.5" />
              AI生成
            </button>
            <button
              type="button"
              onClick={() => setMode("heuristic")}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors ${
                mode === "heuristic"
                  ? "bg-white text-[#1A1A1A] shadow-sm"
                  : "text-[#666666]"
              }`}
              aria-pressed={mode === "heuristic"}
            >
              <Cpu className="h-2.5 w-2.5" />
              ロジック
            </button>
          </div>
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
            {state ? "再生成" : "提案を生成"}
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs text-[#666666]">
        {mode === "ai"
          ? "Claude（Haiku 4.5）が参加者プロファイルから具体的なタイトル＋根拠＋推奨形式まで提案します"
          : "参加者の他カテゴリ嗜好＋AIレベル分布から、ロジックベースで効果的なテーマを抽出します"}
      </p>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {state && state.suggestions.length === 0 && (
        <p className="py-3 text-sm text-[#999999]">
          提案できるデータがまだありません（参加者数が0、または参加履歴データ不足）
        </p>
      )}

      {state && state.mode === "heuristic" && state.suggestions.length > 0 && (
        <ul className="space-y-3">
          {state.suggestions.map((s, i) => (
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

      {state && state.mode === "ai" && state.suggestions.length > 0 && (
        <ul className="space-y-3">
          {state.suggestions.map((s, i) => (
            <li
              key={i}
              className="rounded-xl border border-[#E5E5E5] bg-gradient-to-br from-[#FAFAFA] to-white p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-[#1A1A1A]">
                  <Sparkles className="mr-1 inline-block h-3 w-3 text-[#666666]" />
                  {s.title}
                </p>
              </div>
              <p className="mb-2 text-xs leading-relaxed text-[#666666]">
                {s.rationale}
              </p>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {s.category && (
                  <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] text-[#666666] ring-1 ring-[#E5E5E5]">
                    {s.category}
                  </span>
                )}
                <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] text-[#666666] ring-1 ring-[#E5E5E5]">
                  {s.level}
                </span>
                <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] text-[#666666] ring-1 ring-[#E5E5E5]">
                  {s.format}
                </span>
                <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[10px] text-[#666666] ring-1 ring-[#E5E5E5] tabular-nums">
                  {s.estimated_duration_min}分
                </span>
              </div>
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
