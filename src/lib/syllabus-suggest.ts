import { getAudienceInsights, AI_CATEGORY_SLUGS } from "@/lib/user-history";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminFromAny = (table: string) => ReturnType<
  ReturnType<typeof createAdminClient>["from"]
>;

function fromTable(name: string) {
  const admin = createAdminClient();
  return (admin.from as unknown as AdminFromAny)(name);
}

export type Suggestion = {
  title: string;
  rationale: string;
  category_name: string | null;
  audience_match: number; // 0..1
};

/**
 * 主催者向け：参加者の嗜好からヒューリスティックに次のテーマを提案する。
 * Claude API を使う前段として、まずは集計ベースの素朴なロジックで動かす。
 *
 * - 参加者が「他に参加しているカテゴリ」上位を抽出
 * - そのうち、本イベントの主催者が「まだ開催していない」カテゴリを優先
 * - AIレベル分布から対象レベルをラベル付け
 */
export async function suggestSyllabus(
  eventId: string,
  organizerId: string
): Promise<Suggestion[]> {
  const audience = await getAudienceInsights(eventId);
  if (audience.participant_count === 0) return [];

  // 主催者の過去開催カテゴリを取得（重複提案を避ける）
  const { data: ownEvents } = await fromTable("events")
    .select("category, category_id")
    .eq("creator_id", organizerId);

  const ownCategoryNames = new Set<string>();
  for (const e of (ownEvents ?? []) as Array<{
    category: string | null;
    category_id: number | null;
  }>) {
    if (e.category) ownCategoryNames.add(e.category);
  }
  // category_id を name に変換するため master を引く
  const { data: catRows } = await fromTable("event_categories")
    .select("id, slug, name");
  const catById = new Map<
    number,
    { slug: string; name: string }
  >();
  for (const c of (catRows ?? []) as Array<{
    id: number;
    slug: string;
    name: string;
  }>) {
    catById.set(c.id, { slug: c.slug, name: c.name });
  }
  for (const e of (ownEvents ?? []) as Array<{
    category_id: number | null;
  }>) {
    if (e.category_id != null && catById.has(e.category_id)) {
      ownCategoryNames.add(catById.get(e.category_id)!.name);
    }
  }

  // AIレベル分布から対象レベルを判定
  const dist = audience.audience_ai_level_distribution;
  const levels = Object.entries(dist).filter(([, n]) => n > 0);
  levels.sort(([, a], [, b]) => b - a);
  const dominantLevel = levels[0]?.[0] ?? "初級";

  const levelLabel: Record<string, string> = {
    未参加: "AI入門者向け",
    入門: "入門者向け",
    初級: "初級者向け",
    中級: "中級者向け",
    上級: "上級者・エキスパート向け",
  };

  // 上位カテゴリで主催者が未開催のものを抽出
  const candidates = audience.audience_categories
    .filter((c) => !ownCategoryNames.has(c.name))
    .slice(0, 3);

  const suggestions: Suggestion[] = candidates.map((c) => {
    const matchPct = c.count / audience.participant_count;
    const isAi = Array.from(catById.values()).some(
      (cat) => cat.name === c.name && AI_CATEGORY_SLUGS.has(cat.slug)
    );
    const baseTitle = isAi
      ? `${c.name} ${levelLabel[dominantLevel]} ハンズオン`
      : `${c.name} ${levelLabel[dominantLevel]} ワークショップ`;
    return {
      title: baseTitle,
      rationale: `参加者の${Math.round(matchPct * 100)}%が「${c.name}」の他イベントに参加しています。AIレベルは「${dominantLevel}」が最多で、ニーズに合致する可能性が高いカテゴリです。`,
      category_name: c.name,
      audience_match: Math.round(matchPct * 100) / 100,
    };
  });

  // 候補が少ない場合は、AIレベルに応じた汎用提案で補完
  if (suggestions.length < 3) {
    const fallbacks: Suggestion[] = [
      {
        title: `フォロワー限定の少人数AI座談会（${levelLabel[dominantLevel]}）`,
        rationale: `参加者にはリピーター層が含まれます。少人数の座談会で関係を深めると、継続参加・有料化に繋がりやすい傾向があります。`,
        category_name: "AIコミュニティ・座談会",
        audience_match: 0.5,
      },
      {
        title: `参加者の質問にその場で答えるAI実践会`,
        rationale: `アンケート/Q&A形式は満足度が高く、参加者プロファイルの精度向上にも寄与します。`,
        category_name: null,
        audience_match: 0.4,
      },
    ];
    for (const f of fallbacks) {
      if (suggestions.length >= 3) break;
      suggestions.push(f);
    }
  }

  return suggestions.slice(0, 3);
}
