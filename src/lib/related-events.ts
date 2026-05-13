import { createAdminClient } from "@/lib/supabase/admin";

// ─── 関連イベント取得 ──────────────────────────────────────
// イベント詳細ページの下部に出す「他のおすすめ」3件。
//
// スコア式（高い順）:
//   - タグ一致数 × 10
//   - 同 category_id なら +5
//   - 同主催者なら +3
//   - 開催日が近い（30日以内）なら +1
//
// 終了済み・非公開・本人除外。最大 limit 件。

export type RelatedEvent = {
  id: string;
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  is_limited: boolean;
  price: number;
  capacity: number | null;
  image_url: string | null;
  category: string | null;
  teacher_name: string | null;
  short_code: string | null;
  booking_count: number;
  favorite_count: number;
  score: number;
};

export async function getRelatedEvents(
  currentEventId: string,
  options?: { limit?: number }
): Promise<RelatedEvent[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const limit = options?.limit ?? 3;

  const admin = createAdminClient();

  // ─── 1) 基準イベントを取得 ──────────────────────────
  const { data: base } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )("events")
    .select("id, category_id, creator_id, datetime")
    .eq("id", currentEventId)
    .maybeSingle();
  if (!base) return [];
  const baseRow = base as {
    id: string;
    category_id: number | null;
    creator_id: string | null;
    datetime: string;
  };

  // ─── 2) 基準イベントのタグ ──────────────────────────
  const { data: baseAssigns } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )("event_tag_assignments")
    .select("tag_id")
    .eq("event_id", currentEventId);
  const baseTagIds = new Set(
    ((baseAssigns ?? []) as Array<{ tag_id: number }>).map((a) => a.tag_id)
  );

  // ─── 3) 候補イベントを取得（公開中・未開催・本人以外） ─
  const now = new Date().toISOString();
  const { data: candidates } = await admin
    .from("events")
    .select(
      "id, title, datetime, location, location_type, is_limited, price, capacity, image_url, category, category_id, teacher_name, short_code, creator_id"
    )
    .eq("is_published", true)
    .neq("id", currentEventId)
    .gte("datetime", now)
    .order("datetime", { ascending: true })
    .limit(60); // ある程度の母数を取ってからスコアリング
  const candidateRows = (candidates ?? []) as Array<{
    id: string;
    title: string;
    datetime: string;
    location: string | null;
    location_type: string | null;
    is_limited: boolean;
    price: number;
    capacity: number | null;
    image_url: string | null;
    category: string | null;
    category_id: number | null;
    teacher_name: string | null;
    short_code: string | null;
    creator_id: string | null;
  }>;
  if (candidateRows.length === 0) return [];

  // 限定公開はリストに出さない
  const visible = candidateRows.filter((e) => !e.is_limited);
  if (visible.length === 0) return [];

  // ─── 4) 候補のタグ・予約数・お気に入り数 ────────────
  const ids = visible.map((e) => e.id);
  const [{ data: tagRows }, { data: bookingRows }, { data: favRows }] =
    await Promise.all([
      (admin.from as unknown as (t: string) => ReturnType<typeof admin.from>)(
        "event_tag_assignments"
      )
        .select("event_id, tag_id")
        .in("event_id", ids),
      admin
        .from("bookings")
        .select("event_id")
        .in("event_id", ids)
        .eq("status", "confirmed"),
      (admin.from as unknown as (t: string) => ReturnType<typeof admin.from>)(
        "event_favorites"
      )
        .select("event_id")
        .in("event_id", ids),
    ]);

  const tagsByEvent = new Map<string, Set<number>>();
  for (const r of (tagRows ?? []) as Array<{
    event_id: string;
    tag_id: number;
  }>) {
    const set = tagsByEvent.get(r.event_id) ?? new Set<number>();
    set.add(r.tag_id);
    tagsByEvent.set(r.event_id, set);
  }
  const bookingCounts = new Map<string, number>();
  for (const r of (bookingRows ?? []) as Array<{ event_id: string }>) {
    bookingCounts.set(r.event_id, (bookingCounts.get(r.event_id) ?? 0) + 1);
  }
  const favCounts = new Map<string, number>();
  for (const r of (favRows ?? []) as Array<{ event_id: string }>) {
    favCounts.set(r.event_id, (favCounts.get(r.event_id) ?? 0) + 1);
  }

  // ─── 5) スコアリング ────────────────────────────────
  const nowMs = Date.now();
  const baseTime = new Date(baseRow.datetime).getTime();
  const scored: RelatedEvent[] = visible.map((e) => {
    let score = 0;

    // 5-1. タグ一致
    const evTags = tagsByEvent.get(e.id) ?? new Set<number>();
    let tagMatches = 0;
    for (const t of baseTagIds) if (evTags.has(t)) tagMatches += 1;
    score += tagMatches * 10;

    // 5-2. 同カテゴリ
    if (
      baseRow.category_id != null &&
      e.category_id === baseRow.category_id
    ) {
      score += 5;
    }

    // 5-3. 同主催者
    if (
      baseRow.creator_id &&
      e.creator_id === baseRow.creator_id
    ) {
      score += 3;
    }

    // 5-4. 開催日が近い (基準イベントの前後30日 or 今後30日以内)
    const evMs = new Date(e.datetime).getTime();
    const diffDays = Math.abs(evMs - baseTime) / (24 * 60 * 60 * 1000);
    const futureDays = (evMs - nowMs) / (24 * 60 * 60 * 1000);
    if (diffDays < 30 || futureDays < 30) score += 1;

    return {
      id: e.id,
      title: e.title,
      datetime: e.datetime,
      location: e.location,
      location_type: e.location_type,
      is_limited: e.is_limited,
      price: e.price,
      capacity: e.capacity,
      image_url: e.image_url,
      category: e.category,
      teacher_name: e.teacher_name,
      short_code: e.short_code,
      booking_count: bookingCounts.get(e.id) ?? 0,
      favorite_count: favCounts.get(e.id) ?? 0,
      score,
    };
  });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
