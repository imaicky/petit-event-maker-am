"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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

// collapsible=true のとき、デフォルトで畳んでおくセクション（クリックで展開）。
const COLLAPSIBLE_TYPES: TagRow["tag_type"][] = ["tool", "topic"];

type Props = {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** 表示するtag_typeを制限（未指定なら全種別） */
  types?: TagRow["tag_type"][];
  /** ツール/トピックなど長いセクションを折りたたみにする */
  collapsible?: boolean;
};

export function TagPicker({ selectedIds, onChange, types, collapsible }: Props) {
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

  // 既に選択済みのタグがある section は最初から開いた状態にする。
  const initiallyExpanded = useMemo(() => {
    const expanded = new Set<TagRow["tag_type"]>();
    if (!collapsible) {
      visibleTypes.forEach((t) => expanded.add(t));
      return expanded;
    }
    visibleTypes.forEach((t) => {
      if (!COLLAPSIBLE_TYPES.includes(t)) {
        expanded.add(t);
      } else {
        const selectedInSection = tags.some(
          (tag) => tag.tag_type === t && selectedIds.includes(tag.id)
        );
        if (selectedInSection) expanded.add(t);
      }
    });
    return expanded;
  }, [collapsible, visibleTypes, tags, selectedIds]);

  const [openSections, setOpenSections] =
    useState<Set<TagRow["tag_type"]>>(initiallyExpanded);

  // tags ロード完了後に initiallyExpanded が変わったら反映（初回のみ）。
  useEffect(() => {
    setOpenSections(initiallyExpanded);
    // 意図的に initiallyExpanded を deps に入れない: 初回ロード/選択時のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags.length]);

  const toggleSection = (t: TagRow["tag_type"]) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

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
    <div className="space-y-3">
      {visibleTypes.map((type) => {
        const ofType = tags.filter((t) => t.tag_type === type);
        if (ofType.length === 0) return null;
        const isCollapsible = collapsible && COLLAPSIBLE_TYPES.includes(type);
        const isOpen = openSections.has(type);
        const selectedCount = ofType.filter((t) =>
          selectedIds.includes(t.id)
        ).length;
        return (
          <div key={type}>
            {isCollapsible ? (
              <button
                type="button"
                onClick={() => toggleSection(type)}
                className="flex items-center gap-1 text-xs font-medium text-[#666666] hover:text-[#1A1A1A] mb-1.5"
                aria-expanded={isOpen}
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${
                    isOpen ? "" : "-rotate-90"
                  }`}
                />
                {TYPE_LABELS[type]}
                <span className="text-[10px] text-[#999999] ml-0.5">
                  ({ofType.length}{selectedCount > 0 ? ` / ${selectedCount}選択中` : ""})
                </span>
              </button>
            ) : (
              <p className="text-xs font-medium text-[#666666] mb-1.5">
                {TYPE_LABELS[type]}
              </p>
            )}
            {(!isCollapsible || isOpen) && (
              <div className="flex flex-wrap gap-1">
                {ofType.map((tag) => {
                  const selected = selectedIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggle(tag.id)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                        selected
                          ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                          : "border-[#E5E5E5] bg-white text-[#666666] hover:border-[#1A1A1A]/40"
                      }`}
                      aria-pressed={selected}
                    >
                      {selected && <Check className="h-2.5 w-2.5" />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
