"use client";

import { useEffect, useState } from "react";
import { Users, Sparkles } from "lucide-react";

type TagDist = { tag_id: number; tag_name: string; total: number };
type Stats = {
  follower_count: number;
  upcoming_events: number;
  total_bookings: number;
  audience_tag_distribution: TagDist[];
};

export function OrganizerStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/organizer-stats", {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = (await res.json()) as Stats;
        if (!cancelled) {
          setStats(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl border border-[#E5E5E5] bg-white animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const hasAudienceInsights = stats.audience_tag_distribution.length > 0;
  const maxTotal = stats.audience_tag_distribution[0]?.total ?? 1;

  // 既存の Compact stats bar と重複しないよう、ここでは「フォロワー数」と
  // 「参加者の興味タグ分布」だけを担当する。
  return (
    <div className="mb-6 space-y-4">
      {/* Follower count card */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white px-5 py-4 flex items-center justify-between hover:border-[#1A1A1A]/30 hover:shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#C26A4A] to-[#A85535] text-white">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-[#999999]">あなたをフォロー中の参加者</p>
            <p className="text-2xl font-bold tabular-nums text-[#1A1A1A]">
              {stats.follower_count}
              <span className="ml-1 text-xs font-normal text-[#999999]">人</span>
            </p>
          </div>
        </div>
        {stats.follower_count > 0 && (
          <p className="text-[11px] text-[#999999] max-w-[40%] text-right">
            新しいイベントを公開すると、フォロワーに自動通知メールが届きます
          </p>
        )}
      </div>

      {/* Audience interest distribution */}
      {hasAudienceInsights && (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-[#C26A4A]" />
            <h2 className="text-sm font-bold text-[#1A1A1A]">
              参加者の興味タグ TOP {stats.audience_tag_distribution.length}
            </h2>
            <span className="text-[10px] text-[#999999]">
              （過去予約者の興味プロファイルを合算）
            </span>
          </div>
          <ul className="space-y-1.5">
            {stats.audience_tag_distribution.map((row) => {
              const pct = Math.max(8, Math.round((row.total / maxTotal) * 100));
              return (
                <li key={row.tag_id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-[#1A1A1A]">
                      {row.tag_name}
                    </span>
                    <span className="text-[10px] tabular-nums text-[#999999]">
                      {row.total.toFixed(0)} pt
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#F2F2F2]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C26A4A] to-[#E08060]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[10px] text-[#999999] leading-relaxed">
            次回のイベント企画の参考になります。これらのタグに対応するイベントを作ると、
            参加者の興味とマッチしやすくなります。
          </p>
        </div>
      )}
    </div>
  );
}

