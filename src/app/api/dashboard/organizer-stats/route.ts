import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ─── GET /api/dashboard/organizer-stats ──────────────────────────
// 主催者ダッシュボード上部に出す統計値:
//   - follower_count: 自分をフォローしている参加者の人数
//   - upcoming_events: 公開済み・未開催のイベント数
//   - total_bookings: 自分のイベント全体の confirmed 予約数（生涯）
//   - audience_tag_distribution: 自分のイベントの予約者全員の
//       興味タグスコアを合算したもの。上位10件を返す。
// 自分が主催者でない（イベント未作成）でも 0件で返す。

type TagDist = { tag_id: number; tag_name: string; total: number };
type DailyBooking = { date: string; count: number };
type RecentReview = {
  id: string;
  event_id: string;
  event_title: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  short_code: string | null;
};

type StatsResponse = {
  follower_count: number;
  upcoming_events: number;
  total_bookings: number;
  audience_tag_distribution: TagDist[];
  daily_bookings: DailyBooking[];
  recent_reviews: RecentReview[];
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // ─── Round 1: 独立クエリを並列化 ─────────────────────
  //   - follows (count)
  //   - 自分のイベント一覧
  // どちらも user.id のみ依存で互いに独立。
  const [followerRes, eventsRes] = await Promise.all([
    (admin.from as unknown as (t: string) => ReturnType<typeof admin.from>)(
      "follows"
    )
      .select("*", { count: "exact", head: true })
      .eq("organizer_id", user.id),
    admin
      .from("events")
      .select("id, datetime, is_published")
      .eq("creator_id", user.id),
  ]);

  const followerCount = (followerRes as { count: number | null }).count ?? 0;
  const myEventRows = ((eventsRes as { data: unknown }).data ?? []) as Array<{
    id: string;
    datetime: string;
    is_published: boolean;
  }>;
  const upcomingEvents = myEventRows.filter(
    (e) => e.is_published && new Date(e.datetime).getTime() > now
  ).length;
  const myEventIds = myEventRows.map((e) => e.id);

  // イベント未作成ユーザーは早期 return
  if (myEventIds.length === 0) {
    return jsonWithCache({
      follower_count: followerCount,
      upcoming_events: 0,
      total_bookings: 0,
      audience_tag_distribution: [],
      daily_bookings: [],
      recent_reviews: [],
    });
  }

  // ─── Round 2: myEventIds に依存する3クエリを並列化 ───
  //   - confirmed 予約 (booker_id 抽出 + count)
  //   - 過去30日の予約 (recentBookings)
  //   - 過去7日のレビュー
  const [bookingsRes, recentBookingsRes, reviewsRes] = await Promise.all([
    admin
      .from("bookings")
      .select("user_id", { count: "exact" })
      .in("event_id", myEventIds)
      .eq("status", "confirmed"),
    admin
      .from("bookings")
      .select("created_at")
      .in("event_id", myEventIds)
      .neq("status", "cancelled")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    admin
      .from("reviews")
      .select("id, event_id, reviewer_name, rating, comment, created_at")
      .in("event_id", myEventIds)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalBookings = (bookingsRes as { count: number | null }).count ?? 0;
  const bookerIds = (
    ((bookingsRes as { data: unknown }).data ?? []) as Array<{
      user_id: string | null;
    }>
  )
    .map((b) => b.user_id)
    .filter((id): id is string => !!id);
  const uniqBookerIds = Array.from(new Set(bookerIds));

  const recentBookings = (
    ((recentBookingsRes as { data: unknown }).data ?? []) as Array<{
      created_at: string;
    }>
  );
  const reviewRows = (
    ((reviewsRes as { data: unknown }).data ?? []) as Array<{
      id: string;
      event_id: string;
      reviewer_name: string;
      rating: number;
      comment: string;
      created_at: string;
    }>
  );

  // ─── 過去30日の日別予約推移 (30バケット初期化) ───────
  const counts = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    counts.set(key, 0);
  }
  for (const b of recentBookings) {
    const key = new Date(b.created_at).toLocaleDateString("en-CA", {
      timeZone: "Asia/Tokyo",
    });
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dailyBookings: DailyBooking[] = Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ─── Round 3: 興味タグスコア + レビュー対象イベント を並列化 ─
  //   - scores は uniqBookerIds に依存（Round 2 結果）
  //   - レビューのイベント情報は reviewRows に依存（Round 2 結果）
  const reviewEventIds = reviewRows.map((r) => r.event_id);
  const [scoresRes, reviewEventsRes] = await Promise.all([
    uniqBookerIds.length > 0
      ? (admin.from as unknown as (t: string) => ReturnType<typeof admin.from>)(
          "user_interest_scores"
        )
          .select("tag_id, score")
          .in("user_id", uniqBookerIds)
      : Promise.resolve({ data: [] as Array<{ tag_id: number; score: number }> }),
    reviewEventIds.length > 0
      ? admin
          .from("events")
          .select("id, title, short_code")
          .in("id", reviewEventIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; short_code: string | null }> }),
  ]);

  // ─── 興味タグ集計 + 上位タグの名前を引く ─────────────
  let audienceTagDistribution: TagDist[] = [];
  const scoreRows = ((scoresRes as { data: unknown }).data ?? []) as Array<{
    tag_id: number;
    score: number;
  }>;
  if (scoreRows.length > 0) {
    const byTag = new Map<number, number>();
    for (const s of scoreRows) {
      byTag.set(s.tag_id, (byTag.get(s.tag_id) ?? 0) + s.score);
    }
    if (byTag.size > 0) {
      const top = Array.from(byTag.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);
      const ids = top.map(([id]) => id);

      const { data: tags } = await (
        admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
      )("event_tags")
        .select("id, name")
        .in("id", ids);
      const nameMap = new Map<number, string>(
        ((tags ?? []) as Array<{ id: number; name: string }>).map((t) => [
          t.id,
          t.name,
        ])
      );

      audienceTagDistribution = top
        .map(([tag_id, total]) => ({
          tag_id,
          tag_name: nameMap.get(tag_id) ?? `tag#${tag_id}`,
          total,
        }))
        .filter((row) => nameMap.has(row.tag_id))
        .slice(0, 10);
    }
  }

  // ─── 最新レビュー（イベントタイトル + short_code を結合）─
  const evMap = new Map<string, { title: string; short_code: string | null }>(
    (((reviewEventsRes as { data: unknown }).data ?? []) as Array<{
      id: string;
      title: string;
      short_code: string | null;
    }>).map((e) => [e.id, { title: e.title, short_code: e.short_code }])
  );
  const recentReviews: RecentReview[] = reviewRows.map((r) => ({
    id: r.id,
    event_id: r.event_id,
    event_title: evMap.get(r.event_id)?.title ?? "(イベント不明)",
    short_code: evMap.get(r.event_id)?.short_code ?? null,
    reviewer_name: r.reviewer_name,
    rating: r.rating,
    comment: r.comment,
    created_at: r.created_at,
  }));

  return jsonWithCache({
    follower_count: followerCount,
    upcoming_events: upcomingEvents,
    total_bookings: totalBookings,
    audience_tag_distribution: audienceTagDistribution,
    daily_bookings: dailyBookings,
    recent_reviews: recentReviews,
  });
}

// レスポンスを 30 秒だけブラウザにキャッシュ。
// 統計が30秒古いことは許容範囲、操作直後に毎回叩かれるのを防ぐ。
function jsonWithCache(body: StatsResponse) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}
