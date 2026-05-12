import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type InterestRow = {
  tag_id: number;
  tag_name: string;
  tag_type: string;
  total: number;
  sources: Record<string, number>;
};

const SOURCE_LABEL: Record<string, string> = {
  booking: "予約",
  view: "閲覧",
  favorite: "お気に入り",
  explicit: "明示登録",
};

const TAG_TYPE_LABEL: Record<string, string> = {
  format: "開催形式",
  level: "レベル",
  tool: "ツール",
  topic: "トピック",
};

async function getInterests(userId: string): Promise<InterestRow[]> {
  const admin = createAdminClient();

  const { data: scores } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )("user_interest_scores")
    .select("tag_id, source, score")
    .eq("user_id", userId);

  const rows = (scores ?? []) as Array<{
    tag_id: number;
    source: string;
    score: number;
  }>;
  if (rows.length === 0) return [];

  // tag_id ごとに total + 内訳を集計
  type Bucket = { total: number; sources: Record<string, number> };
  const byTag = new Map<number, Bucket>();
  for (const r of rows) {
    const bucket = byTag.get(r.tag_id) ?? { total: 0, sources: {} };
    bucket.total += r.score;
    bucket.sources[r.source] = (bucket.sources[r.source] ?? 0) + r.score;
    byTag.set(r.tag_id, bucket);
  }

  // タグ名を取得
  const tagIds = Array.from(byTag.keys());
  const { data: tags } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )("event_tags")
    .select("id, name, tag_type")
    .in("id", tagIds);
  const tagMap = new Map<
    number,
    { name: string; tag_type: string }
  >(
    ((tags ?? []) as Array<{ id: number; name: string; tag_type: string }>).map(
      (t) => [t.id, { name: t.name, tag_type: t.tag_type }]
    )
  );

  const result: InterestRow[] = [];
  for (const [tagId, bucket] of byTag) {
    const t = tagMap.get(tagId);
    if (!t) continue;
    result.push({
      tag_id: tagId,
      tag_name: t.name,
      tag_type: t.tag_type,
      total: bucket.total,
      sources: bucket.sources,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export default async function MyInterestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  let interests: InterestRow[] = [];
  try {
    interests = await getInterests(user.id);
  } catch {
    // fallthrough
  }

  const maxScore = interests[0]?.total ?? 0;
  const grouped: Record<string, InterestRow[]> = {};
  for (const r of interests) {
    (grouped[r.tag_type] ||= []).push(r);
  }
  const typeOrder = ["topic", "tool", "format", "level"];

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/my"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          マイページに戻る
        </Link>

        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#C26A4A]" />
          <h1 className="text-xl font-bold text-[#1A1A1A]">興味プロファイル</h1>
        </div>
        <p className="mb-6 text-xs text-[#999999] leading-relaxed">
          予約・閲覧・お気に入りから自動で集計された、あなたの興味タグです。
          スコアが高いほど推薦フィード（あなたへのおすすめ）で重視されます。
        </p>

        {interests.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-[#999999]" />
            <p className="mb-4 text-sm text-[#666666]">
              まだ興味タグが集まっていません
            </p>
            <p className="mb-5 text-xs text-[#999999]">
              イベントの予約・閲覧・お気に入り登録で自動的に蓄積されます
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-5 py-2 text-sm font-medium text-white"
            >
              イベントを探す
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {typeOrder
              .filter((t) => grouped[t]?.length)
              .map((type) => (
                <section key={type}>
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#999999]">
                    {TAG_TYPE_LABEL[type] ?? type}
                  </h2>
                  <ul className="space-y-2">
                    {grouped[type].map((row) => {
                      const pct =
                        maxScore > 0
                          ? Math.max(8, Math.round((row.total / maxScore) * 100))
                          : 0;
                      return (
                        <li
                          key={row.tag_id}
                          className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-[#1A1A1A]">
                              {row.tag_name}
                            </span>
                            <span className="text-xs tabular-nums text-[#999999]">
                              {row.total.toFixed(0)} pt
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F2F2F2]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#C26A4A] to-[#E08060]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {Object.keys(row.sources).length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-[#999999]">
                              {Object.entries(row.sources).map(([src, val]) => (
                                <span
                                  key={src}
                                  className="rounded-full bg-[#F7F7F7] px-2 py-0.5"
                                >
                                  {SOURCE_LABEL[src] ?? src}: {val.toFixed(0)}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
