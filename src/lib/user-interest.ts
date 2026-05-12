import { createAdminClient } from "@/lib/supabase/admin";

// ─── F3-02 興味プロファイル ────────────────────────────────
// イベントへの行動（予約/閲覧/お気に入り/明示）からタグスコアを蓄積する。
// スコアは F3-03 パーソナライズフィードで合算 (SUM) して特徴量に使う。

export const SCORE_BY_SOURCE: Record<
  "booking" | "view" | "favorite" | "explicit",
  number
> = {
  booking: 5,
  view: 1,
  favorite: 3,
  explicit: 10,
};

type AdminFromAny = (table: string) => ReturnType<
  ReturnType<typeof createAdminClient>["from"]
>;

function table(name: string) {
  const admin = createAdminClient();
  return (admin.from as unknown as AdminFromAny)(name);
}

/**
 * イベント予約時に該当イベントのタグ群に「+5」を加点する。
 * 同一 (user, tag, source='booking') が既にある場合は加算（upsertではなくRPC的に）。
 *
 * 失敗してもメインの予約処理を壊さないよう、呼び出し側で catch して飲み込む想定。
 */
export async function recordInterestFromBooking(
  userId: string | null,
  eventId: string
): Promise<void> {
  if (!userId) return; // 未ログイン予約は記録しない
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  // イベントのタグを取得
  const { data: assigns } = await table("event_tag_assignments")
    .select("tag_id")
    .eq("event_id", eventId);
  const tagIds = ((assigns ?? []) as Array<{ tag_id: number }>).map(
    (a) => a.tag_id
  );

  // category_id もタグと同等に扱いたい場合は将来追加。MVPでは tag_id のみ。

  if (tagIds.length === 0) return;

  const delta = SCORE_BY_SOURCE.booking;

  // 既存スコアを取り、足し込む。
  // 多対多なので 1人あたり tag数 (普通は5以下) しか queryしないため、O(1)に近い。
  for (const tagId of tagIds) {
    const { data: existing } = await table("user_interest_scores")
      .select("score")
      .eq("user_id", userId)
      .eq("tag_id", tagId)
      .eq("source", "booking")
      .maybeSingle();

    if (existing) {
      const current = (existing as { score: number }).score;
      await table("user_interest_scores")
        .update({ score: current + delta, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("tag_id", tagId)
        .eq("source", "booking");
    } else {
      await table("user_interest_scores").insert({
        user_id: userId,
        tag_id: tagId,
        source: "booking",
        score: delta,
      });
    }
  }
}

/**
 * イベント閲覧時に該当イベントのタグ群に「+1」を加点する。
 *
 * 同じ (user, event) を24時間以内に再度閲覧した場合は、
 * このメソッドを呼ぶ前に view 履歴をチェックして skip すること。
 * （重複加点防止は呼び出し側の責務）
 *
 * 内部処理は recordInterestFromBooking と同じ「upsert+加算」ロジック。
 */
export async function recordInterestFromView(
  userId: string | null,
  eventId: string
): Promise<void> {
  if (!userId) return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const { data: assigns } = await table("event_tag_assignments")
    .select("tag_id")
    .eq("event_id", eventId);
  const tagIds = ((assigns ?? []) as Array<{ tag_id: number }>).map(
    (a) => a.tag_id
  );
  if (tagIds.length === 0) return;

  const delta = SCORE_BY_SOURCE.view;

  for (const tagId of tagIds) {
    const { data: existing } = await table("user_interest_scores")
      .select("score")
      .eq("user_id", userId)
      .eq("tag_id", tagId)
      .eq("source", "view")
      .maybeSingle();

    if (existing) {
      const current = (existing as { score: number }).score;
      await table("user_interest_scores")
        .update({ score: current + delta, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("tag_id", tagId)
        .eq("source", "view");
    } else {
      await table("user_interest_scores").insert({
        user_id: userId,
        tag_id: tagId,
        source: "view",
        score: delta,
      });
    }
  }
}

/**
 * 同じ (user, event) が直近24時間に閲覧されているかをチェックする。
 * recordInterestFromView を呼ぶ前に使い、重複加点を防ぐ。
 */
export async function hasRecentView(
  userId: string,
  eventId: string,
  windowHours = 24
): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { count } = await (table("event_views") as unknown as {
    select: (cols: string, opts: { count: "exact"; head: true }) => {
      eq: (k: string, v: string) => {
        eq: (k: string, v: string) => {
          gte: (k: string, v: string) => Promise<{ count: number | null }>;
        };
      };
    };
  })
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .gte("viewed_at", since);
  return (count ?? 0) > 0;
}

/**
 * ユーザーの興味タグを集計して、スコア降順で返す。
 * F3-03 のパーソナライズフィードで「興味タグID集合」として使う。
 *
 * limit を超えると低スコア側を切り捨てる。
 */
export async function getAggregatedInterest(
  userId: string,
  options?: { limit?: number }
): Promise<Array<{ tag_id: number; total: number }>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const limit = options?.limit ?? 30;

  const { data } = await table("user_interest_scores")
    .select("tag_id, score")
    .eq("user_id", userId);

  const rows = (data ?? []) as Array<{ tag_id: number; score: number }>;
  if (rows.length === 0) return [];

  // tag_id ごとに合計
  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(r.tag_id, (map.get(r.tag_id) ?? 0) + r.score);
  }

  return Array.from(map.entries())
    .map(([tag_id, total]) => ({ tag_id, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
