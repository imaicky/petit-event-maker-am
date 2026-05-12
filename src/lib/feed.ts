import { createAdminClient } from "@/lib/supabase/admin";

type AdminFromAny = (table: string) => ReturnType<
  ReturnType<typeof createAdminClient>["from"]
>;

function fromTable(name: string) {
  const admin = createAdminClient();
  return (admin.from as unknown as AdminFromAny)(name);
}

// ─── スコア重み（チューニング可能） ────────────────────────────
export const FEED_WEIGHTS = {
  tagMatch: 0.4, // 興味タグ一致
  followBoost: 0.25, // フォロー中の主催者
  recency: 0.15, // 開催日が近い
  popularity: 0.15, // 予約数 / 定員
  novelty: 0.05, // 未閲覧ボーナス
} as const;

// 後方互換用エイリアス（既存コードはWEIGHTSを参照）
const WEIGHTS = FEED_WEIGHTS;

export const MAX_FEED_SIZE = 24;

// ─── 純粋関数: 単一イベントのスコア計算（テスト可能）─────────
export type ScoringContext = {
  interestTagIds: Set<number>;
  followingOrgIds: Set<string>;
  viewedEventIds: Set<string>;
  attendedCategoryIds: Set<number>;
  isLoggedIn: boolean;
  now: number;
};

export type ScoringEvent = {
  id: string;
  datetime: string;
  capacity: number | null;
  is_limited: boolean;
  creator_id: string | null;
  category_id: number | null;
  tagIds: number[];
  bookingCount: number;
};

export function calculateEventScore(
  event: ScoringEvent,
  ctx: ScoringContext
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // 1. タグマッチ
  let tagMatch = 0;
  if (ctx.interestTagIds.size > 0) {
    const hits = event.tagIds.filter((t) => ctx.interestTagIds.has(t)).length;
    if (hits > 0) {
      tagMatch = Math.min(1, hits / 3);
      reasons.push(`興味タグ${hits}件マッチ`);
    }
  }
  if (
    tagMatch === 0 &&
    event.category_id != null &&
    ctx.attendedCategoryIds.has(event.category_id)
  ) {
    tagMatch = 0.6;
    reasons.push("過去参加カテゴリ");
  }
  score += FEED_WEIGHTS.tagMatch * tagMatch;

  // 2. フォローブースト
  if (event.creator_id && ctx.followingOrgIds.has(event.creator_id)) {
    score += FEED_WEIGHTS.followBoost;
    reasons.push("フォロー中の主催者");
  }

  // 3. 開催日近接
  const daysAhead =
    (new Date(event.datetime).getTime() - ctx.now) / (24 * 60 * 60 * 1000);
  if (daysAhead >= 0) {
    const recencyScore = Math.max(0, 1 - daysAhead / 30);
    score += FEED_WEIGHTS.recency * recencyScore;
  }

  // 4. 人気度
  const cap = event.capacity ?? 0;
  if (cap > 0) {
    const fill = event.bookingCount / cap;
    const popScore = fill < 0.9 ? fill : 1 - (fill - 0.9) * 5;
    score += FEED_WEIGHTS.popularity * Math.max(0, popScore);
    if (fill >= 0.7 && fill < 0.9) reasons.push("人気上昇中");
  }

  // 5. 未閲覧ボーナス
  if (ctx.isLoggedIn && !ctx.viewedEventIds.has(event.id)) {
    score += FEED_WEIGHTS.novelty;
  }

  // 6. 限定公開イベントはタグマッチが弱いと除外
  if (event.is_limited && tagMatch < 0.3) {
    score = 0;
  }

  return { score, reasons };
}

export type FeedEvent = {
  id: string;
  title: string;
  description: string | null;
  datetime: string;
  location: string | null;
  location_type: string | null;
  capacity: number | null;
  price: number;
  image_url: string | null;
  category: string | null;
  category_id: number | null;
  category_name: string | null;
  teacher_name: string | null;
  short_code: string | null;
  is_limited: boolean;
  creator_id: string | null;
  booking_count: number;
  // ─── feed メタデータ ──
  score: number;
  reasons: string[];
};

/**
 * パーソナライズフィードを生成。
 *
 * - 未来のイベントのみ
 * - 公開済みのみ
 * - 限定公開イベントは興味マッチ時のみ含める
 * - スコア = w1*tagMatch + w2*followBoost + w3*recency + w4*popularity + w5*novelty
 *
 * userId が null（未ログイン）の場合は人気イベント（fill rate + recency）で代替。
 */
export async function buildPersonalizedFeed(
  userId: string | null
): Promise<FeedEvent[]> {
  const now = Date.now();

  // 1. 公開済みの未来イベントを取得
  const { data: eventRows } = await fromTable("events")
    .select(
      "id, title, description, datetime, location, location_type, capacity, price, image_url, category, category_id, teacher_name, short_code, is_limited, creator_id"
    )
    .eq("is_published", true)
    .gte("datetime", new Date(now).toISOString())
    .order("datetime", { ascending: true })
    .limit(200);

  const events = (eventRows ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    datetime: string;
    location: string | null;
    location_type: string | null;
    capacity: number | null;
    price: number;
    image_url: string | null;
    category: string | null;
    category_id: number | null;
    teacher_name: string | null;
    short_code: string | null;
    is_limited: boolean;
    creator_id: string | null;
  }>;

  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.id);

  // 2. 予約数を取得
  const { data: bookingRows } = await fromTable("bookings")
    .select("event_id")
    .in("event_id", eventIds)
    .eq("status", "confirmed");
  const bookingMap: Record<string, number> = {};
  for (const r of (bookingRows ?? []) as Array<{ event_id: string }>) {
    bookingMap[r.event_id] = (bookingMap[r.event_id] ?? 0) + 1;
  }

  // 3. カテゴリ master
  const { data: catRows } = await fromTable("event_categories")
    .select("id, slug, name");
  const catById = new Map<number, { slug: string; name: string }>();
  for (const c of (catRows ?? []) as Array<{
    id: number;
    slug: string;
    name: string;
  }>) {
    catById.set(c.id, { slug: c.slug, name: c.name });
  }

  // 4. ユーザー固有データ（ログインしているなら）
  let interestTagIds = new Set<number>();
  let followingOrgIds = new Set<string>();
  let viewedEventIds = new Set<string>();
  let attendedCategoryIds = new Set<number>();
  let dismissedEventIds = new Set<string>();

  if (userId) {
    // 興味タグ
    const { data: scores } = await fromTable("user_interest_scores")
      .select("tag_id")
      .eq("user_id", userId);
    for (const s of (scores ?? []) as Array<{ tag_id: number }>) {
      interestTagIds.add(s.tag_id);
    }

    // フォロー中の主催者
    const { data: follows } = await fromTable("follows")
      .select("organizer_id")
      .eq("follower_id", userId);
    for (const f of (follows ?? []) as Array<{ organizer_id: string }>) {
      followingOrgIds.add(f.organizer_id);
    }

    // 閲覧済みイベント（直近100件）
    const { data: views } = await fromTable("event_views")
      .select("event_id")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(100);
    for (const v of (views ?? []) as Array<{ event_id: string }>) {
      viewedEventIds.add(v.event_id);
    }

    // 「興味なし」で除外したイベント
    const { data: dismissals } = await fromTable("user_event_dismissals")
      .select("event_id")
      .eq("user_id", userId);
    for (const d of (dismissals ?? []) as Array<{ event_id: string }>) {
      dismissedEventIds.add(d.event_id);
    }

    // 過去参加カテゴリ（興味プロファイルが空の場合のフォールバック）
    if (interestTagIds.size === 0) {
      const { data: pastBookings } = await fromTable("bookings")
        .select("event_id")
        .eq("user_id", userId)
        .eq("status", "confirmed");
      const pastEventIds = ((pastBookings ?? []) as Array<{
        event_id: string;
      }>).map((b) => b.event_id);
      if (pastEventIds.length > 0) {
        const { data: pastEvents } = await fromTable("events")
          .select("category_id")
          .in("id", pastEventIds);
        for (const e of (pastEvents ?? []) as Array<{
          category_id: number | null;
        }>) {
          if (e.category_id != null) attendedCategoryIds.add(e.category_id);
        }
      }
    }
  }

  // 5. 各イベントにタグ割当を取得（バルク）
  const { data: assigns } = await fromTable("event_tag_assignments")
    .select("event_id, tag_id")
    .in("event_id", eventIds);
  const tagsByEvent: Record<string, number[]> = {};
  for (const a of (assigns ?? []) as Array<{
    event_id: string;
    tag_id: number;
  }>) {
    if (!tagsByEvent[a.event_id]) tagsByEvent[a.event_id] = [];
    tagsByEvent[a.event_id].push(a.tag_id);
  }

  // 6. スコア計算
  const maxRecencyMs = 30 * 24 * 60 * 60 * 1000; // 30日先まで段階的にブースト
  const scored: FeedEvent[] = events.map((e) => {
    const reasons: string[] = [];
    let score = 0;

    // 6-1. タグマッチ
    let tagMatch = 0;
    if (interestTagIds.size > 0) {
      const evTags = tagsByEvent[e.id] ?? [];
      const hits = evTags.filter((t) => interestTagIds.has(t)).length;
      if (hits > 0) {
        tagMatch = Math.min(1, hits / 3); // 3タグ以上で満点
        reasons.push(`興味タグ${hits}件マッチ`);
      }
    }
    // フォールバック: 過去カテゴリ一致
    if (
      tagMatch === 0 &&
      e.category_id != null &&
      attendedCategoryIds.has(e.category_id)
    ) {
      tagMatch = 0.6;
      reasons.push("過去参加カテゴリ");
    }
    score += WEIGHTS.tagMatch * tagMatch;

    // 6-2. フォローブースト
    if (e.creator_id && followingOrgIds.has(e.creator_id)) {
      score += WEIGHTS.followBoost;
      reasons.push("フォロー中の主催者");
    }

    // 6-3. 開催日が近いほど高スコア
    const daysAhead =
      (new Date(e.datetime).getTime() - now) / (24 * 60 * 60 * 1000);
    if (daysAhead >= 0) {
      const recencyScore = Math.max(0, 1 - daysAhead / 30);
      score += WEIGHTS.recency * recencyScore;
    }

    // 6-4. 人気度（fill rate / capacity）
    const bookings = bookingMap[e.id] ?? 0;
    const cap = e.capacity ?? 0;
    if (cap > 0) {
      const fill = bookings / cap;
      // 80%超えると満員リスクなのでむしろ減衰させる（90%以上は上限）
      const popScore = fill < 0.9 ? fill : 1 - (fill - 0.9) * 5;
      score += WEIGHTS.popularity * Math.max(0, popScore);
      if (fill >= 0.7 && fill < 0.9) reasons.push("人気上昇中");
    }

    // 6-5. 未閲覧ボーナス（毎回同じものを見せない）
    if (userId && !viewedEventIds.has(e.id)) {
      score += WEIGHTS.novelty;
    }

    // 6-6. 限定公開イベントはタグマッチが弱いと除外
    if (e.is_limited && tagMatch < 0.3) {
      score = 0;
    }

    // 6-7. 「興味なし」で本人が除外したイベントは完全に隠す
    if (dismissedEventIds.has(e.id)) {
      score = 0;
    }

    // 7. カテゴリ名解決
    const categoryName =
      e.category_id != null && catById.has(e.category_id)
        ? catById.get(e.category_id)!.name
        : null;

    return {
      ...e,
      booking_count: bookings,
      category_name: categoryName,
      score,
      reasons,
    };
  });

  // 8. スコア降順でソート、限定公開のうちスコア0のものは除外
  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FEED_SIZE);
}

/**
 * 単純な人気フィード（未ログインユーザー向け）。
 * fill rate + 開催日近接で並べる。
 */
export async function buildPopularFeed(): Promise<FeedEvent[]> {
  return buildPersonalizedFeed(null);
}
