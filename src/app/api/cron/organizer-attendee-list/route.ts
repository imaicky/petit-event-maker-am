import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildOrganizerAttendeeListFlex,
  multicastFlexMessage,
  pushFlexMessage,
} from "@/lib/line";

// ─── GET /api/cron/organizer-attendee-list ──────────────────
// Vercel cron が毎日0時 UTC（JST 9時）に呼ぶ。
// 翌日開催（24〜48時間後）のイベントの主催者LINEに、現時点での参加者リストを送る。
//
// 主催者にだけ送る（フォロワー全体への配信ではない）。
// 重複送信防止のため events.organizer_attendee_list_sent でガード。

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Missing service role key" }, { status: 500 });
  }

  const admin = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app";
  const now = new Date();
  const from = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const { data: events, error: evErr } = await admin
      .from("events")
      .select(
        "id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, price, capacity, image_url, short_code, creator_id"
      )
      .eq("is_published", true)
      .eq("organizer_attendee_list_sent", false)
      .gte("datetime", from.toISOString())
      .lt("datetime", to.toISOString());

    if (evErr) {
      return NextResponse.json({ error: evErr.message }, { status: 500 });
    }

    for (const event of events ?? []) {
      try {
        const ev = event as {
          id: string;
          title: string;
          datetime: string;
          location: string | null;
          location_type: string | null;
          price: number;
          capacity: number | null;
          image_url: string | null;
          short_code: string | null;
          creator_id: string;
        };
        if (!ev.creator_id) {
          skipped++;
          continue;
        }

        // 主催者のLINEアカウント
        const { data: la } = await admin
          .from("line_accounts")
          .select("channel_access_token, owner_line_user_id, notify_line_user_ids, is_active, notify_on_booking")
          .eq("user_id", ev.creator_id)
          .maybeSingle();
        if (!la) {
          skipped++;
          continue;
        }
        const account = la as {
          channel_access_token: string | null;
          owner_line_user_id: string | null;
          notify_line_user_ids: string[] | null;
          is_active: boolean;
          notify_on_booking: boolean;
        };
        if (!account.is_active || !account.notify_on_booking || !account.channel_access_token) {
          skipped++;
          continue;
        }

        // 通知先（フォロワー一般ではなく管理者のみ）
        const recipients = (account.notify_line_user_ids?.length
          ? account.notify_line_user_ids
          : account.owner_line_user_id
          ? [account.owner_line_user_id]
          : []) as string[];
        if (recipients.length === 0) {
          skipped++;
          continue;
        }

        // 参加者（確定済みのみ）
        const { data: bookings } = await admin
          .from("bookings")
          .select("guest_name, attendance_format, created_at")
          .eq("event_id", ev.id)
          .eq("status", "confirmed")
          .order("created_at", { ascending: true });

        const attendees = (bookings ?? []).map((b) => ({
          guest_name: (b as { guest_name: string }).guest_name,
          attendance_format: (b as { attendance_format?: string | null }).attendance_format ?? null,
        }));

        const flex = buildOrganizerAttendeeListFlex(
          {
            id: ev.id,
            title: ev.title,
            datetime: ev.datetime,
            location: ev.location,
            location_type: ev.location_type,
            price: ev.price,
            capacity: ev.capacity,
            image_url: ev.image_url,
            short_code: ev.short_code,
          },
          attendees,
          baseUrl,
          "明日開催"
        );
        const altText = `📋 明日開催: ${ev.title}（${attendees.length}名参加）`;

        if (recipients.length === 1) {
          await pushFlexMessage(account.channel_access_token, recipients[0], altText, flex);
        } else {
          await multicastFlexMessage(account.channel_access_token, recipients, altText, flex);
        }

        // 重複送信防止フラグ
        await admin
          .from("events")
          .update({ organizer_attendee_list_sent: true })
          .eq("id", ev.id);

        sent++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`event ${(event as { id?: string }).id ?? "?"}: ${msg}`);
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      window: { from: from.toISOString(), to: to.toISOString() },
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
