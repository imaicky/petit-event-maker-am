import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";

// ─── GET /api/cron/weekly-digest ──────────────────────────────
// 週次cron (月曜 08:00 JST): 主催者に過去1週間のサマリーを送る。
//
// 集計対象:
//   - 過去1週間 (created_at) の予約数
//   - 過去1週間のお気に入り登録数
//   - 過去1週間のレビュー数+平均
//   - 過去1週間のイベント閲覧数
//   - 今後1週間のイベント (リマインダー)
//
// 主催者で「過去1年以内に1イベント以上公開した人」だけが対象。

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}` &&
    process.env.NODE_ENV !== "development"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Missing service role key" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // ─── 活動中の主催者を抽出 ─────────────────────────────
  const { data: recentEvents } = await admin
    .from("events")
    .select("creator_id")
    .gte("created_at", oneYearAgo.toISOString())
    .not("creator_id", "is", null);
  const creatorSet = new Set(
    ((recentEvents ?? []) as Array<{ creator_id: string | null }>)
      .map((e) => e.creator_id)
      .filter((id): id is string => !!id)
  );
  const creatorIds = Array.from(creatorSet);
  if (creatorIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, organizers: 0 });
  }

  // ─── auth.users から email を取得 ─────────────────────
  const emailById = new Map<string, string>();
  try {
    const { data: usersList } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    for (const u of (usersList?.users ?? []) as Array<{
      id: string;
      email?: string | null;
    }>) {
      if (creatorIds.includes(u.id) && u.email) {
        emailById.set(u.id, u.email);
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: `auth listUsers: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  let sent = 0;
  const errors: string[] = [];

  for (const creatorId of creatorIds) {
    const email = emailById.get(creatorId);
    if (!email) continue;

    try {
      // 主催者の全イベントID
      const { data: myEvents } = await admin
        .from("events")
        .select("id, title, datetime, short_code")
        .eq("creator_id", creatorId);
      const myEventList = (myEvents ?? []) as Array<{
        id: string;
        title: string;
        datetime: string;
        short_code: string | null;
      }>;
      const myEventIds = myEventList.map((e) => e.id);
      if (myEventIds.length === 0) continue;

      // 過去1週間の予約数
      const { count: bookingsCount } = await admin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("event_id", myEventIds)
        .gte("created_at", oneWeekAgo.toISOString())
        .eq("status", "confirmed");

      // 過去1週間のお気に入り
      const { count: favoritesCount } = await (
        admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
      )("event_favorites")
        .select("*", { count: "exact", head: true })
        .in("event_id", myEventIds)
        .gte("created_at", oneWeekAgo.toISOString());

      // 過去1週間のレビュー
      const { data: reviewsData } = await admin
        .from("reviews")
        .select("rating")
        .in("event_id", myEventIds)
        .gte("created_at", oneWeekAgo.toISOString());
      const reviewsRows = (reviewsData ?? []) as Array<{ rating: number }>;
      const reviewsCount = reviewsRows.length;
      const avgRating =
        reviewsCount > 0
          ? (
              reviewsRows.reduce((s, r) => s + r.rating, 0) / reviewsCount
            ).toFixed(1)
          : null;

      // 過去1週間の閲覧数
      const { count: viewsCount } = await (
        admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
      )("event_views")
        .select("*", { count: "exact", head: true })
        .in("event_id", myEventIds)
        .gte("viewed_at", oneWeekAgo.toISOString());

      // 今週末まで（7日先）に開催するイベント
      const upcoming = myEventList
        .filter((e) => {
          const t = new Date(e.datetime).getTime();
          return t >= now.getTime() && t <= oneWeekAhead.getTime();
        })
        .slice(0, 5);

      // 何もアクションがなかったら送らない
      const totalActivity =
        (bookingsCount ?? 0) +
        (favoritesCount ?? 0) +
        reviewsCount +
        (viewsCount ?? 0);
      if (totalActivity === 0 && upcoming.length === 0) continue;

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        "https://petit-event-maker-am.vercel.app";

      const upcomingHtml = upcoming
        .map((e) => {
          const dt = new Date(e.datetime).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            month: "numeric",
            day: "numeric",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          const url = e.short_code
            ? `${baseUrl}/e/${e.short_code}`
            : `${baseUrl}/events/${e.id}`;
          const safeTitle = e.title
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return `<li style="margin-bottom:6px"><a href="${url}" style="color:#1A1A1A;text-decoration:none">${dt} ・ ${safeTitle}</a></li>`;
        })
        .join("");

      const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#ffffff;border-radius:16px;border:1px solid #e5e5e5;padding:28px 24px">
    <h1 style="font-size:18px;font-weight:bold;color:#1A1A1A;margin:0 0 4px">📊 今週のあなたのイベントまとめ</h1>
    <p style="font-size:11px;color:#999;margin:0 0 18px">${oneWeekAgo.toLocaleDateString("ja-JP")} 〜 ${now.toLocaleDateString("ja-JP")}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
      <tr>
        <td style="padding:8px;background:#F7F7F7;border-radius:8px"><p style="font-size:11px;color:#999;margin:0">予約</p><p style="font-size:20px;font-weight:bold;color:#1A1A1A;margin:0">${bookingsCount ?? 0}<span style="font-size:11px;color:#999;margin-left:4px">件</span></p></td>
        <td style="width:4px"></td>
        <td style="padding:8px;background:#FFF1F2;border-radius:8px"><p style="font-size:11px;color:#999;margin:0">♡ お気に入り</p><p style="font-size:20px;font-weight:bold;color:#E11D48;margin:0">${favoritesCount ?? 0}<span style="font-size:11px;color:#999;margin-left:4px">件</span></p></td>
      </tr>
      <tr><td colspan="3" style="height:6px"></td></tr>
      <tr>
        <td style="padding:8px;background:#F7F7F7;border-radius:8px"><p style="font-size:11px;color:#999;margin:0">⭐ レビュー</p><p style="font-size:20px;font-weight:bold;color:#1A1A1A;margin:0">${reviewsCount}${avgRating ? `<span style="font-size:11px;color:#999;margin-left:4px">件 平均 ${avgRating}</span>` : '<span style="font-size:11px;color:#999;margin-left:4px">件</span>'}</p></td>
        <td style="width:4px"></td>
        <td style="padding:8px;background:#ECFDF5;border-radius:8px"><p style="font-size:11px;color:#999;margin:0">閲覧</p><p style="font-size:20px;font-weight:bold;color:#047857;margin:0">${viewsCount ?? 0}<span style="font-size:11px;color:#999;margin-left:4px">回</span></p></td>
      </tr>
    </table>

    ${
      upcoming.length > 0
        ? `<h2 style="font-size:13px;font-weight:bold;color:#1A1A1A;margin:18px 0 8px">📅 今後1週間の開催</h2><ul style="padding-left:18px;font-size:13px;margin:0">${upcomingHtml}</ul>`
        : ""
    }

    <div style="margin-top:24px"><a href="${baseUrl}/dashboard" style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:24px;font-weight:bold;font-size:14px">ダッシュボードを開く</a></div>

    <p style="margin-top:24px;font-size:11px;color:#999;line-height:1.6">
      この週次サマリーは「過去1年以内にイベントを公開した主催者」に毎週月曜お送りしています。
      停止希望は <a href="${baseUrl}/settings/profile" style="color:#666">設定</a> から（実装予定）。
    </p>
  </div>
</div>
</body></html>`;

      if (process.env.RESEND_API_KEY) {
        await sendBatchEmails({
          to: [email],
          subject: `📊 今週のイベントまとめ - 予約 ${bookingsCount ?? 0}件 / ♡ ${favoritesCount ?? 0}件`,
          html,
        });
        sent += 1;
      }
    } catch (e) {
      errors.push(
        `creator ${creatorId}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return NextResponse.json({
    ok: true,
    organizers: creatorIds.length,
    sent,
    errors: errors.length > 0 ? errors : undefined,
    checked_at: now.toISOString(),
  });
}
