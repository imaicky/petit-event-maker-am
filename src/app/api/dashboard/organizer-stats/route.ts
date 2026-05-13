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

  // ─── 1) フォロワー数 ─────────────────────────────────────
  const { count: followerCount } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )("follows")
    .select("*", { count: "exact", head: true })
    .eq("organizer_id", user.id);

  // ─── 2) 自分のイベント一覧（id だけ） ──────────────────
  const { data: events } = await admin
    .from("events")
    .select("id, datetime, is_published")
    .eq("creator_id", user.id);

  const myEventRows = (events ?? []) as Array<{
    id: string;
    datetime: string;
    is_published: boolean;
  }>;
  const now = Date.now();
  const upcomingEvents = myEventRows.filter(
    (e) => e.is_published && new Date(e.datetime).getTime() > now
  ).length;

  const myEventIds = myEventRows.map((e) => e.id);

  // ─── 3) 自分のイベントの予約者 (user_id) を全部集める ────
  let bookerIds: string[] = [];
  let totalBookings = 0;
  if (myEventIds.length > 0) {
    const { data: bookings, count } = await admin
      .from("bookings")
      .select("user_id", { count: "exact" })
      .in("event_id", myEventIds)
      .eq("status", "confirmed");
    totalBookings = count ?? 0;
    bookerIds = ((bookings ?? []) as Array<{ user_id: string | null }>)
      .map((b) => b.user_id)
      .filter((id): id is string => !!id);
  }
  const uniqBookerIds = Array.from(new Set(bookerIds));

  // ─── 3b) 過去30日の日別予約推移 ─────────────────────────
  // confirmed/waitlisted 問わず、created_at ベースで集計（予約が入った日）
  const dailyBookings: DailyBooking[] = [];
  if (myEventIds.length > 0) {
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const { data: recentBookings } = await admin
      .from("bookings")
      .select("created_at")
      .in("event_id", myEventIds)
      .neq("status", "cancelled")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const counts = new Map<string, number>();
    // 30日分のバケットをゼロで初期化（連続性のあるチャート）
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
      counts.set(key, 0);
    }
    for (const b of (recentBookings ?? []) as Array<{ created_at: string }>) {
      const key = new Date(b.created_at).toLocaleDateString("en-CA", {
        timeZone: "Asia/Tokyo",
      });
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [date, count] of counts) {
      dailyBookings.push({ date, count });
    }
    dailyBookings.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ─── 4) 予約者の興味タグスコアを合算（上位10件） ──────
  let audienceTagDistribution: TagDist[] = [];
  if (uniqBookerIds.length > 0) {
    const { data: scores } = await (
      admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
    )("user_interest_scores")
      .select("tag_id, score")
      .in("user_id", uniqBookerIds);

    type S = { tag_id: number; score: number };
    const byTag = new Map<number, number>();
    for (const s of (scores ?? []) as S[]) {
      byTag.set(s.tag_id, (byTag.get(s.tag_id) ?? 0) + s.score);
    }

    if (byTag.size > 0) {
      // 上位30件のタグIDを取って名前を引く
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

  // ─── 6) 過去7日に投稿された自分のイベントへのレビュー ──
  let recentReviews: RecentReview[] = [];
  if (myEventIds.length > 0) {
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const { data: reviews } = await admin
      .from("reviews")
      .select("id, event_id, reviewer_name, rating, comment, created_at")
      .in("event_id", myEventIds)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    const reviewRows = (reviews ?? []) as Array<{
      id: string;
      event_id: string;
      reviewer_name: string;
      rating: number;
      comment: string;
      created_at: string;
    }>;
    if (reviewRows.length > 0) {
      // イベントタイトルと short_code をマップ
      const evIds = reviewRows.map((r) => r.event_id);
      const { data: evRows } = await admin
        .from("events")
        .select("id, title, short_code")
        .in("id", evIds);
      const evMap = new Map<string, { title: string; short_code: string | null }>(
        ((evRows ?? []) as Array<{
          id: string;
          title: string;
          short_code: string | null;
        }>).map((e) => [e.id, { title: e.title, short_code: e.short_code }])
      );
      recentReviews = reviewRows.map((r) => ({
        id: r.id,
        event_id: r.event_id,
        event_title: evMap.get(r.event_id)?.title ?? "(イベント不明)",
        short_code: evMap.get(r.event_id)?.short_code ?? null,
        reviewer_name: r.reviewer_name,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      }));
    }
  }

  const body: StatsResponse = {
    follower_count: followerCount ?? 0,
    upcoming_events: upcomingEvents,
    total_bookings: totalBookings,
    audience_tag_distribution: audienceTagDistribution,
    daily_bookings: dailyBookings,
    recent_reviews: recentReviews,
  };
  return NextResponse.json(body);
}
