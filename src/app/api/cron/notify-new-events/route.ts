import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { buildNewEventEmailHtml } from "@/lib/email-templates";
import {
  buildNewEventFlexBubble,
  multicastFlexMessage,
} from "@/lib/line";
import { signUnsubscribeToken } from "@/lib/unsubscribe-token";

// ─── GET /api/cron/notify-new-events ──────────────────────────
// Daily Vercel cron: notifies followers about newly published events.
//
// Pickup条件:
//   - is_published = true
//   - follower_notified_at IS NULL  (idempotency lock)
//   - created_at >= now - 7d        (avoid spam from old drafts that
//                                    suddenly get published)
//
// 既存パターン（reminders cron）と揃えてある。

const LOOKBACK_DAYS = 7;

type EventRow = {
  id: string;
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  online_url: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  price: number;
  capacity: number | null;
  image_url: string | null;
  short_code: string | null;
  creator_id: string | null;
};

type FollowRow = {
  follower_id: string;
  notify_email: boolean;
  notify_line: boolean;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  line_user_id: string | null;
  // email は profiles に直接持たないので auth.users から取得する
};

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

  try {
    const admin = createAdminClient();
    const now = new Date();
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://petit-event-maker-am.vercel.app";

    const lookbackFrom = new Date(
      now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );

    const { data: events, error: evErr } = await admin
      .from("events")
      .select(
        "id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, price, capacity, image_url, short_code, creator_id"
      )
      .eq("is_published", true)
      .is("follower_notified_at", null)
      .gte("created_at", lookbackFrom.toISOString())
      .not("creator_id", "is", null)
      .order("created_at", { ascending: true });

    if (evErr) {
      return NextResponse.json(
        { error: `events query: ${evErr.message}` },
        { status: 500 }
      );
    }

    let totalNotified = 0;
    let totalEmails = 0;
    let totalLine = 0;
    const errors: string[] = [];
    const processed: string[] = [];

    for (const event of (events ?? []) as EventRow[]) {
      try {
        const result = await notifyFollowersOfEvent(admin, event, baseUrl);
        totalNotified += result.followers;
        totalEmails += result.emails;
        totalLine += result.line;
        if (result.errors.length > 0) errors.push(...result.errors);
        processed.push(event.id);

        // 通知送信が0件でも、idempotency のため必ずマークする。
        // 0件のケース: 主催者にフォロワーがいない / フォロワー全員が
        // notify_email=false かつ notify_line=false を選択 / etc.
        await admin
          .from("events")
          .update({ follower_notified_at: now.toISOString() })
          .eq("id", event.id);
      } catch (e) {
        errors.push(
          `event ${event.id}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      events_processed: processed.length,
      followers_notified: totalNotified,
      emails_sent: totalEmails,
      line_messages_sent: totalLine,
      errors: errors.length > 0 ? errors : undefined,
      checked_at: now.toISOString(),
    });
  } catch (err) {
    console.error("[GET /api/cron/notify-new-events] Fatal error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyFollowersOfEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  event: EventRow,
  baseUrl: string
): Promise<{
  followers: number;
  emails: number;
  line: number;
  errors: string[];
}> {
  const errors: string[] = [];

  if (!event.creator_id) {
    return { followers: 0, emails: 0, line: 0, errors };
  }

  // ── 1) 主催者プロフィール（メール本文中の表示名 + LINE channel ID） ──
  const { data: organizer } = await admin
    .from("profiles")
    .select("id, display_name, username")
    .eq("id", event.creator_id)
    .maybeSingle();
  const organizerName: string =
    (organizer as { display_name?: string | null; username?: string | null } | null)
      ?.display_name ||
    (organizer as { username?: string | null } | null)?.username ||
    "主催者";

  // ── 2) フォロワー一覧（通知設定込み） ─────────────────────────
  const { data: follows, error: fErr } = await admin
    .from("follows")
    .select("follower_id, notify_email, notify_line")
    .eq("organizer_id", event.creator_id);
  if (fErr) {
    errors.push(`follows query (${event.id}): ${fErr.message}`);
    return { followers: 0, emails: 0, line: 0, errors };
  }

  const rows = (follows ?? []) as FollowRow[];
  if (rows.length === 0) {
    return { followers: 0, emails: 0, line: 0, errors };
  }

  // ── 3) profiles で line_user_id を取得 + auth.users から email を取得 ──
  const followerIds = rows.map((r) => r.follower_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, username, line_user_id")
    .in("id", followerIds);
  const profById = new Map<string, ProfileRow>();
  for (const p of (profiles ?? []) as ProfileRow[]) profById.set(p.id, p);

  // auth.users.email は service role からのみ参照可
  const emailById = new Map<string, string>();
  try {
    // admin.auth.admin.listUsers は最大1000件返す。MVP段階では十分。
    // 将来フォロワー数が増えた場合は ID 単位で getUserById を回す。
    const { data: usersList } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    const users = (usersList?.users ?? []) as Array<{
      id: string;
      email?: string | null;
    }>;
    for (const u of users) {
      if (followerIds.includes(u.id) && u.email) {
        emailById.set(u.id, u.email);
      }
    }
  } catch (e) {
    errors.push(
      `auth listUsers (${event.id}): ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // ── 4) Email 送信 ────────────────────────────────────────────
  const dateStr = new Date(event.datetime).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const eventUrl = event.short_code
    ? `${baseUrl}/e/${event.short_code}`
    : `${baseUrl}/events/${event.id}`;
  const subject = `【新着イベント】${organizerName}さんが「${event.title}」を公開しました`;

  // 各フォロワーごとに署名された購読停止URLを発行する必要があるため、
  // バッチ送信ではなく1通ずつ送る（Promise.all で並列化）。
  type EmailTarget = { followerId: string; email: string };
  const emailTargets: EmailTarget[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.notify_email) continue;
    const e = emailById.get(row.follower_id);
    if (!e || !e.includes("@")) continue;
    if (seen.has(e)) continue; // dedupe by email
    seen.add(e);
    emailTargets.push({ followerId: row.follower_id, email: e });
  }

  let sentEmails = 0;
  if (process.env.RESEND_API_KEY && emailTargets.length > 0 && event.creator_id) {
    await Promise.all(
      emailTargets.map(async (t) => {
        try {
          const unsubToken = signUnsubscribeToken(
            t.followerId,
            event.creator_id!,
            "email"
          );
          const unsubscribeUrl = `${baseUrl}/api/notifications/unsubscribe?t=${encodeURIComponent(
            unsubToken
          )}`;
          const html = buildNewEventEmailHtml(
            organizerName,
            event.title,
            dateStr,
            event.location ?? "未定",
            eventUrl,
            unsubscribeUrl
          );
          await sendBatchEmails({
            to: [t.email],
            subject,
            html,
          });
          sentEmails += 1;
        } catch (err) {
          errors.push(
            `email (${event.id} → ${t.email}): ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      })
    );
  }

  // ── 5) LINE 送信 ────────────────────────────────────────────
  // 主催者の LINE channel から、自分のフォロワー（line_followers）に対してのみ
  // multicast できる。プラットフォーム上のフォロワーが LINE 友だちでない場合は飛ばない。
  let sentLine = 0;
  const lineCandidateUserIds: string[] = [];
  for (const row of rows) {
    if (!row.notify_line) continue;
    const p = profById.get(row.follower_id);
    if (p?.line_user_id) lineCandidateUserIds.push(p.line_user_id);
  }

  if (lineCandidateUserIds.length > 0) {
    try {
      const { data: lineAccount } = await admin
        .from("line_accounts")
        .select("id, channel_access_token, is_active")
        .eq("user_id", event.creator_id)
        .maybeSingle();

      if (lineAccount?.is_active && lineAccount.channel_access_token) {
        const { data: followersInChannel } = await admin
          .from("line_followers")
          .select("line_user_id")
          .eq("line_account_id", lineAccount.id)
          .eq("is_following", true)
          .in("line_user_id", lineCandidateUserIds);

        const reachable = (followersInChannel ?? [])
          .map((f: { line_user_id: string }) => f.line_user_id)
          .filter(Boolean) as string[];
        const dedupedLine = [...new Set(reachable)];

        if (dedupedLine.length > 0) {
          const bubble = buildNewEventFlexBubble(
            { ...event, booking_count: 0 },
            organizerName,
            baseUrl
          );
          const result = await multicastFlexMessage(
            lineAccount.channel_access_token,
            dedupedLine,
            `✨ ${organizerName}さんの新着: ${event.title}`,
            bubble
          );
          if (result.ok) sentLine = dedupedLine.length;
          else errors.push(`line multicast (${event.id}): ${result.error}`);
        }
      }
    } catch (err) {
      errors.push(
        `line (${event.id}): ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ── 6) notifications テーブルにログ ────────────────────────
  // 一通ずつ insert は重いので、サマリ1行で記録する（既存パターン踏襲）
  if (sentEmails > 0 || sentLine > 0) {
    try {
      await admin.from("notifications").insert({
        recipient_email: null,
        type: "new_event_followers",
        subject,
        body: `event_id=${event.id} emails=${sentEmails} line=${sentLine}`,
      });
    } catch {
      // notifications 失敗は致命的ではない
    }
  }

  return {
    followers: rows.length,
    emails: sentEmails,
    line: sentLine,
    errors,
  };
}
