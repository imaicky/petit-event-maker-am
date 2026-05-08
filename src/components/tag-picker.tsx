"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export type TagRow = {
  id: number;
  slug: string;
  name: string;
  tag_type: "format" | "level" | "tool" | "topic";
};

const TYPE_LABELS: Record<TagRow["tag_type"], string> = {
  format: "形式",
  level: "対象レベル",
  tool: "ツール",
  topic: "トピック",
};

const TYPE_ORDER: TagRow["tag_type"][] = ["format", "level", "tool", "topic"];

type Props = {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** 表示するtag_typeを制限（未指定なら全種別） */
  types?: TagRow["tag_type"][];
};

export function TagPicker({ selectedIds, onChange, types }: Props) {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tags")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setTags(Array.isArray(json.tags) ? json.tags : []);
      })
      .catch(() => {
        if (!cancelled) setTags([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const visibleTypes = types ?? TYPE_ORDER;

  if (loading) {
    return (
      <p className="text-xs text-[#999999]">タグを読み込み中…</p>
    );
  }

  if (tags.length === 0) {
    return (
      <p className="text-xs text-[#999999]">
        タグはまだ利用できません（マイグレーション未適用の可能性があります）
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visibleTypes.map((type) => {
        const ofType = tags.filter((t) => t.tag_type === type);
        if (ofType.length === 0) return null;
        return (
          <div key={type}>
            <p className="text-xs font-medium text-[#666666] mb-1.5">
              {TYPE_LABELS[type]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ofType.map((tag) => {
                const selected = selectedIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggle(tag.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                      selected
                        ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                        : "border-[#E5E5E5] bg-white text-[#666666] hover:border-[#1A1A1A]/40"
                    }`}
                    aria-pressed={selected}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
