import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { buildFavoriteReminderEmailHtml } from "@/lib/email-templates";

// ─── GET /api/cron/favorite-reminders ──────────────────────────
// 日次cron: お気に入り登録済み・未予約ユーザーへ
// 開催が近づいているイベントのリマインダーメールを送る。
//
// 条件:
//   - イベント開催が 2〜4日後 (Hobby plan の日次cron 想定で幅広く取る)
//   - イベントは is_published = true
//   - event_favorites.reminded_at IS NULL
//   - そのユーザーが confirmed/waitlisted で予約していない
//
// 送信したら reminded_at を埋めて二度送らないようにする。

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
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://petit-event-maker-am.vercel.app";

  // 2〜4日後のイベント
  const from = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const { data: events, error: evErr } = await admin
    .from("events")
    .select("id, title, datetime, location, short_code")
    .eq("is_published", true)
    .gte("datetime", from.toISOString())
    .lt("datetime", to.toISOString());

  if (evErr) {
    return NextResponse.json(
      { error: `events query: ${evErr.message}` },
      { status: 500 }
    );
  }
  const eventList = (events ?? []) as Array<{
    id: string;
    title: string;
    datetime: string;
    location: string | null;
    short_code: string | null;
  }>;
  if (eventList.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, events: 0 });
  }

  let totalSent = 0;
  const errors: string[] = [];

  for (const event of eventList) {
    try {
      // ─── 未通知のお気に入り登録 ─────────────────────
      const { data: favs } = await (
        admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
      )("event_favorites")
        .select("user_id")
        .eq("event_id", event.id)
        .is("reminded_at", null);
      const favUserIds = ((favs ?? []) as Array<{ user_id: string }>).map(
        (f) => f.user_id
      );
      if (favUserIds.length === 0) continue;

      // ─── 既に予約済みのユーザーは除外 ────────────────
      const { data: bookings } = await admin
        .from("bookings")
        .select("user_id")
        .eq("event_id", event.id)
        .in("user_id", favUserIds)
        .in("status", ["confirmed", "waitlisted"]);
      const bookedSet = new Set(
        ((bookings ?? []) as Array<{ user_id: string | null }>)
          .map((b) => b.user_id)
          .filter((id): id is string => !!id)
      );
      const targetIds = favUserIds.filter((id) => !bookedSet.has(id));
      if (targetIds.length === 0) continue;

      // ─── auth.users から email を引く ────────────────
      const emailById = new Map<string, string>();
      try {
        const { data: usersList } = await admin.auth.admin.listUsers({
          perPage: 1000,
        });
        for (const u of (usersList?.users ?? []) as Array<{
          id: string;
          email?: string | null;
        }>) {
          if (targetIds.includes(u.id) && u.email) {
            emailById.set(u.id, u.email);
          }
        }
      } catch (e) {
        errors.push(
          `auth listUsers (${event.id}): ${
            e instanceof Error ? e.message : String(e)
          }`
        );
        continue;
      }

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
      const unfavoriteUrl = `${baseUrl}/my/favorites`;

      // ─── 各人に個別送信（per-user body は同じだが email が異なる） ──
      if (process.env.RESEND_API_KEY) {
        await Promise.all(
          targetIds.map(async (userId) => {
            const e = emailById.get(userId);
            if (!e) return;
            try {
              const html = buildFavoriteReminderEmailHtml(
                null, // 名前は profiles から取れるが MVP では簡略化
                event.title,
                dateStr,
                event.location ?? "未定",
                eventUrl,
                unfavoriteUrl
              );
              await sendBatchEmails({
                to: [e],
                subject: `【お気に入りイベント】${event.title} が近づいています`,
                html,
              });
              totalSent += 1;
            } catch (err) {
              errors.push(
                `send (${event.id} → ${e}): ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            }
          })
        );
      }

      // ─── reminded_at を埋める（送信できたかに関わらず二重送信を防ぐ） ──
      await (
        admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
      )("event_favorites")
        .update({ reminded_at: now.toISOString() })
        .eq("event_id", event.id)
        .in("user_id", targetIds);
    } catch (e) {
      errors.push(
        `event ${event.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return NextResponse.json({
    ok: true,
    events_processed: eventList.length,
    sent: totalSent,
    errors: errors.length > 0 ? errors : undefined,
    checked_at: now.toISOString(),
  });
}
