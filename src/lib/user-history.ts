import { createAdminClient } from "@/lib/supabase/admin";

type AdminFromAny = (table: string) => ReturnType<
  ReturnType<typeof createAdminClient>["from"]
>;

function fromTable(name: string) {
  const admin = createAdminClient();
  return (admin.from as unknown as AdminFromAny)(name);
}

// ─── AI領域カテゴリの判定 ───────────────────────────────────────────
// 新タクソノミー（event_categories）の AI 系 slug
export const AI_CATEGORY_SLUGS = new Set([
  "llm",
  "image-gen",
  "video-gen",
  "audio",
  "prompt-eng",
  "ai-dev",
  "ai-business",
  "ai-creative",
  "ai-community",
]);

// 既存 events.category テキストのうち、AI 関連と見做すもの（補完用）
export const AI_LEGACY_CATEGORY_PATTERNS = [/AI/i, /ＡＩ/, /生成/, /プロンプト/];

export function isAiLegacy(category: string | null | undefined): boolean {
  if (!category) return false;
  return AI_LEGACY_CATEGORY_PATTERNS.some((re) => re.test(category));
}

// ─── ユーザーの参加履歴アグリゲート ──────────────────────────────────
export type CategoryStat = { name: string; count: number };

export type AiLevel = "未参加" | "入門" | "初級" | "中級" | "上級";

export function inferAiLevel(aiEventCount: number, distinctAiDomains: number): AiLevel {
  // Adversarial fix: 負値・NaN・Infinity を防御
  if (!Number.isFinite(aiEventCount) || aiEventCount <= 0) return "未参加";
  if (aiEventCount <= 2) return "入門";
  if (aiEventCount <= 5) {
    return distinctAiDomains >= 3 ? "中級" : "初級";
  }
  if (aiEventCount <= 10) return "中級";
  return "上級";
}

export type UserHistory = {
  total_events: number;
  total_categories: number;
  by_category: CategoryStat[];
  by_tag_topic: CategoryStat[];
  ai_event_count: number;
  ai_distinct_domains: number;
  ai_level: AiLevel;
  recommended_next: CategoryStat[];
  recent_events: Array<{
    id: string;
    title: string;
    datetime: string;
    category: string | null;
  }>;
};

const TOP_LIMIT = 8;
const RECENT_LIMIT = 6;

export async function getUserHistory(userId: string): Promise<UserHistory> {
  // 1. 確定予約の event_id を取得
  const { data: bookingRows } = await fromTable("bookings")
    .select("event_id")
    .eq("user_id", userId)
    .eq("status", "confirmed");

  const eventIds = ((bookingRows ?? []) as Array<{ event_id: string }>).map(
    (r) => r.event_id
  );

  if (eventIds.length === 0) {
    return {
      total_events: 0,
      total_categories: 0,
      by_category: [],
      by_tag_topic: [],
      ai_event_count: 0,
      ai_distinct_domains: 0,
      ai_level: "未参加",
      recommended_next: [],
      recent_events: [],
    };
  }

  // 2. 該当イベントを取得（タイトル/日時/カテゴリID/レガシーカテゴリ）
  const { data: eventRows } = await fromTable("events")
    .select("id, title, datetime, category, category_id")
    .in("id", eventIds);

  const events = (eventRows ?? []) as Array<{
    id: string;
    title: string;
    datetime: string;
    category: string | null;
    category_id: number | null;
  }>;

  // 3. 新タクソノミーのカテゴリmaster取得
  const { data: catRows } = await fromTable("event_categories")
    .select("id, slug, name")
    .eq("is_active", true);

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

  // 4. event_tag_assignments のトピック別集計
  const { data: assignRows } = await fromTable("event_tag_assignments")
    .select("event_id, tag_id")
    .in("event_id", eventIds);
  const assignList = (assignRows ?? []) as Array<{
    event_id: string;
    tag_id: number;
  }>;
  const assignedTagIds = Array.from(new Set(assignList.map((a) => a.tag_id)));
  const tagById = new Map<
    number,
    { slug: string; name: string; tag_type: string }
  >();
  if (assignedTagIds.length > 0) {
    const { data: tagRows } = await fromTable("event_tags")
      .select("id, slug, name, tag_type")
      .in("id", assignedTagIds);
    for (const t of (tagRows ?? []) as Array<{
      id: number;
      slug: string;
      name: string;
      tag_type: string;
    }>) {
      tagById.set(t.id, { slug: t.slug, name: t.name, tag_type: t.tag_type });
    }
  }

  // 5. カテゴリ別集計
  const byCategoryMap: Record<string, number> = {};
  const aiDomainSet = new Set<string>();
  let aiEventCount = 0;

  for (const ev of events) {
    let label: string | null = null;
    let aiSlug: string | null = null;

    if (ev.category_id != null && catById.has(ev.category_id)) {
      const c = catById.get(ev.category_id)!;
      label = c.name;
      if (AI_CATEGORY_SLUGS.has(c.slug)) {
        aiSlug = c.slug;
      }
    } else if (ev.category) {
      label = ev.category;
      if (isAiLegacy(ev.category)) {
        aiSlug = `legacy:${ev.category}`;
      }
    } else {
      label = "未分類";
    }

    if (label) {
      byCategoryMap[label] = (byCategoryMap[label] ?? 0) + 1;
    }
    if (aiSlug) {
      aiEventCount += 1;
      aiDomainSet.add(aiSlug);
    }
  }

  const by_category = Object.entries(byCategoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LIMIT);

  // 6. トピックタグ集計（topic タイプのみ）
  const tagCount: Record<string, number> = {};
  for (const a of assignList) {
    const t = tagById.get(a.tag_id);
    if (!t || t.tag_type !== "topic") continue;
    tagCount[t.name] = (tagCount[t.name] ?? 0) + 1;
  }
  const by_tag_topic = Object.entries(tagCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LIMIT);

  // 7. レコメンド: AI領域でまだ未参加のドメインから提案
  const allAiCats = (catRows ?? []) as Array<{
    id: number;
    slug: string;
    name: string;
  }>;
  const recommended_next = allAiCats
    .filter((c) => AI_CATEGORY_SLUGS.has(c.slug))
    .filter((c) => !aiDomainSet.has(c.slug))
    .slice(0, 4)
    .map((c) => ({ name: c.name, count: 0 }));

  // 8. 最近の参加イベント
  const recent_events = [...events]
    .sort((a, b) => (a.datetime < b.datetime ? 1 : -1))
    .slice(0, RECENT_LIMIT)
    .map((e) => ({
      id: e.id,
      title: e.title,
      datetime: e.datetime,
      category:
        e.category_id != null && catById.has(e.category_id)
          ? catById.get(e.category_id)!.name
          : e.category,
    }));

  return {
    total_events: events.length,
    total_categories: by_category.length,
    by_category,
    by_tag_topic,
    ai_event_count: aiEventCount,
    ai_distinct_domains: aiDomainSet.size,
    ai_level: inferAiLevel(aiEventCount, aiDomainSet.size),
    recommended_next,
    recent_events,
  };
}

// ─── 純粋関数: イベント配列を受けて履歴を集計（テスト可能） ──
const RECENT_LIMIT_PURE = 6;
const TOP_LIMIT_PURE = 8;

export type AggregateInput = {
  events: Array<{
    id: string;
    title: string;
    datetime: string;
    category: string | null;
    category_id: number | null;
  }>;
  categoriesMaster: Array<{ id: number; slug: string; name: string }>;
  topicTagAssignments: Array<{ event_id: string; tag_id: number }>;
  topicTags: Array<{ id: number; name: string; tag_type: string }>;
};

export function aggregateUserHistory(
  input: AggregateInput
): {
  total_events: number;
  total_categories: number;
  by_category: CategoryStat[];
  by_tag_topic: CategoryStat[];
  ai_event_count: number;
  ai_distinct_domains: number;
  ai_level: AiLevel;
  recommended_next: CategoryStat[];
  recent_events: Array<{
    id: string;
    title: string;
    datetime: string;
    category: string | null;
  }>;
} {
  const catById = new Map<number, { slug: string; name: string }>();
  for (const c of input.categoriesMaster) {
    catById.set(c.id, { slug: c.slug, name: c.name });
  }

  const byCategoryMap: Record<string, number> = {};
  const aiDomainSet = new Set<string>();
  let aiEventCount = 0;

  for (const ev of input.events) {
    let label: string | null = null;
    let aiSlug: string | null = null;

    if (ev.category_id != null && catById.has(ev.category_id)) {
      const c = catById.get(ev.category_id)!;
      label = c.name;
      if (AI_CATEGORY_SLUGS.has(c.slug)) aiSlug = c.slug;
    } else if (ev.category) {
      label = ev.category;
      if (isAiLegacy(ev.category)) aiSlug = `legacy:${ev.category}`;
    } else {
      label = "未分類";
    }

    if (label) byCategoryMap[label] = (byCategoryMap[label] ?? 0) + 1;
    if (aiSlug) {
      aiEventCount += 1;
      aiDomainSet.add(aiSlug);
    }
  }

  const by_category = Object.entries(byCategoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LIMIT_PURE);

  // トピックタグ集計
  const tagById = new Map(input.topicTags.map((t) => [t.id, t]));
  const tagCount: Record<string, number> = {};
  for (const a of input.topicTagAssignments) {
    const t = tagById.get(a.tag_id);
    if (!t || t.tag_type !== "topic") continue;
    tagCount[t.name] = (tagCount[t.name] ?? 0) + 1;
  }
  const by_tag_topic = Object.entries(tagCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LIMIT_PURE);

  // レコメンド: 未経験のAI領域
  const recommended_next = input.categoriesMaster
    .filter((c) => AI_CATEGORY_SLUGS.has(c.slug))
    .filter((c) => !aiDomainSet.has(c.slug))
    .slice(0, 4)
    .map((c) => ({ name: c.name, count: 0 }));

  // 最近のイベント
  const recent_events = [...input.events]
    .sort((a, b) => (a.datetime < b.datetime ? 1 : -1))
    .slice(0, RECENT_LIMIT_PURE)
    .map((e) => ({
      id: e.id,
      title: e.title,
      datetime: e.datetime,
      category:
        e.category_id != null && catById.has(e.category_id)
          ? catById.get(e.category_id)!.name
          : e.category,
    }));

  return {
    total_events: input.events.length,
    total_categories: by_category.length,
    by_category,
    by_tag_topic,
    ai_event_count: aiEventCount,
    ai_distinct_domains: aiDomainSet.size,
    ai_level: inferAiLevel(aiEventCount, aiDomainSet.size),
    recommended_next,
    recent_events,
  };
}

// ─── 主催者向け: 自イベント参加者の他カテゴリ嗜好 ──────────────────
export type AudienceInsights = {
  participant_count: number;
  audience_categories: CategoryStat[]; // 参加者が他に参加しているカテゴリ
  audience_ai_level_distribution: Record<AiLevel, number>;
};

export async function getAudienceInsights(
  eventId: string
): Promise<AudienceInsights> {
  // 1. このイベントの確定参加者の user_id 一覧
  const { data: bookings } = await fromTable("bookings")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .not("user_id", "is", null);

  const userIds = Array.from(
    new Set(
      ((bookings ?? []) as Array<{ user_id: string | null }>)
        .map((b) => b.user_id)
        .filter((id): id is string => id != null)
    )
  );

  if (userIds.length === 0) {
    return {
      participant_count: 0,
      audience_categories: [],
      audience_ai_level_distribution: {
        未参加: 0,
        入門: 0,
        初級: 0,
        中級: 0,
        上級: 0,
      },
    };
  }

  // 2. 参加者の他のbookings（同イベントを除外）
  const { data: otherBookings } = await fromTable("bookings")
    .select("user_id, event_id")
    .in("user_id", userIds)
    .eq("status", "confirmed")
    .neq("event_id", eventId);

  const otherList = (otherBookings ?? []) as Array<{
    user_id: string;
    event_id: string;
  }>;
  const otherEventIds = Array.from(new Set(otherList.map((b) => b.event_id)));

  // 3. それらのイベントのカテゴリ取得
  const categoryMap: Record<string, number> = {};
  const userAiCount = new Map<string, Set<string>>();

  if (otherEventIds.length > 0) {
    const { data: eventRows } = await fromTable("events")
      .select("id, category, category_id")
      .in("id", otherEventIds);

    const evById = new Map<
      string,
      { category: string | null; category_id: number | null }
    >();
    for (const e of (eventRows ?? []) as Array<{
      id: string;
      category: string | null;
      category_id: number | null;
    }>) {
      evById.set(e.id, {
        category: e.category,
        category_id: e.category_id,
      });
    }

    const { data: catRows } = await fromTable("event_categories")
      .select("id, slug, name")
      .eq("is_active", true);
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

    for (const b of otherList) {
      const ev = evById.get(b.event_id);
      if (!ev) continue;

      let label: string | null = null;
      let aiSlug: string | null = null;
      if (ev.category_id != null && catById.has(ev.category_id)) {
        const c = catById.get(ev.category_id)!;
        label = c.name;
        if (AI_CATEGORY_SLUGS.has(c.slug)) aiSlug = c.slug;
      } else if (ev.category) {
        label = ev.category;
        if (isAiLegacy(ev.category)) aiSlug = `legacy:${ev.category}`;
      }

      if (label) categoryMap[label] = (categoryMap[label] ?? 0) + 1;
      if (aiSlug) {
        if (!userAiCount.has(b.user_id))
          userAiCount.set(b.user_id, new Set());
        userAiCount.get(b.user_id)!.add(aiSlug);
      }
    }
  }

  // 4. AIレベル分布
  const dist: Record<AiLevel, number> = {
    未参加: 0,
    入門: 0,
    初級: 0,
    中級: 0,
    上級: 0,
  };
  for (const uid of userIds) {
    const aiSet = userAiCount.get(uid) ?? new Set();
    // 参加者ごとのAIイベント数も別途集計したいので otherList から数える
    const aiEvs = otherList.filter(
      (b) => b.user_id === uid
    ).length; // total ai events approximated by total events; refine later
    void aiEvs; // currently unused, distinct domains alone drive level
    const lvl = inferAiLevel(
      // count of AI events == size of aiSet for unique events; here we estimate
      Array.from(aiSet).length,
      aiSet.size
    );
    dist[lvl] = (dist[lvl] ?? 0) + 1;
  }

  const audience_categories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LIMIT);

  return {
    participant_count: userIds.length,
    audience_categories,
    audience_ai_level_distribution: dist,
  };
}
