"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, MapPin } from "lucide-react";

interface ExploreFiltersProps {
  initialQ: string;
  initialCategory: string;
  initialArea: string;
  initialSort: string;
}

export function ExploreFilters({
  initialQ,
  initialCategory,
  initialArea,
  initialSort,
}: ExploreFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams({
        ...(initialQ ? { q: initialQ } : {}),
        ...(initialCategory ? { category: initialCategory } : {}),
        ...(initialArea ? { area: initialArea } : {}),
        ...(initialSort !== "new" ? { sort: initialSort } : {}),
        ...updates,
      });
      // Remove empty values
      for (const [k, v] of Array.from(params.entries())) {
        if (!v) params.delete(k);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, initialQ, initialCategory, initialArea, initialSort]
  );

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row ${isPending ? "opacity-70" : ""}`}
    >
      {/* Keyword search */}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
        <input
          type="search"
          placeholder="キーワードで検索..."
          defaultValue={initialQ}
          onChange={(e) => updateParams({ q: e.target.value })}
          className="h-10 w-full rounded-xl border border-[#E5E5E5] bg-white pl-9 pr-3 text-sm text-[#1A1A1A] placeholder:text-[#999999] outline-none focus:border-[#1A1A1A] focus:ring-2 focus:ring-[#1A1A1A]/20"
        />
      </div>

      {/* Area search */}
      <div className="relative sm:w-44">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
        <input
          type="search"
          placeholder="エリアで絞り込み"
          defaultValue={initialArea}
          onChange={(e) => updateParams({ area: e.target.value })}
          className="h-10 w-full rounded-xl border border-[#E5E5E5] bg-white pl-9 pr-3 text-sm text-[#1A1A1A] placeholder:text-[#999999] outline-none focus:border-[#1A1A1A] focus:ring-2 focus:ring-[#1A1A1A]/20"
        />
      </div>

      {/* Sort */}
      <select
        defaultValue={initialSort}
        onChange={(e) => updateParams({ sort: e.target.value })}
        className="h-10 rounded-xl border border-[#E5E5E5] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A] focus:ring-2 focus:ring-[#1A1A1A]/20 sm:w-36"
        aria-label="並び替え"
      >
        <option value="new">新しい順</option>
        <option value="date">日付が近い順</option>
        <option value="popular">人気順</option>
      </select>
    </div>
  );
}
