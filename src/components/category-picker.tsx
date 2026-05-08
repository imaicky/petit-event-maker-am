"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  parent_id: number | null;
  sort_order: number;
};

type Props = {
  value: number | null;
  onChange: (id: number | null) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setCategories(Array.isArray(json.categories) ? json.categories : []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-[#999999]">
        <Loader2 className="h-3 w-3 animate-spin" />
        カテゴリを読み込み中…
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="py-2 text-xs text-[#999999]">
        カテゴリ一覧を取得できませんでした
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((cat) => {
        const selected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(selected ? null : cat.id)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              selected
                ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                : "border-[#E5E5E5] bg-white text-[#666666] hover:border-[#1A1A1A]/40"
            }`}
            aria-pressed={selected}
          >
            {selected && <Check className="h-3 w-3" />}
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
