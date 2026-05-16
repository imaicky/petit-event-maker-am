import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildOrganizerAttendeeListFlex,
  multicastFlexMessage,
  pushFlexMessage,
} from "@/lib/line";

// ─── POST /api/events/[id]/send-attendee-list ─────────────────
// 主催者（イベント creator）が今すぐ参加者リストをLINEで受け取るボタン。
// 当日セミナーの直前確認や、cronを待たずに通知したいときに使う。

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await props.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }

    const admin = createAdminClient();

    // イベント取得＆主催者チェック
    const { data: ev } = await admin
      .from("events")
      .select(
        "id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, price, capacity, image_url, short_code, creator_id"
      )
      .eq("id", eventId)
      .maybeSingle();
    if (!ev) {
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }
    const event = ev as {
      id: string;
      title: string;
      datetime: string;
      location: string | null;
      location_type: string | null;
      price: number;
      capacity: number | null;
      image_url: string | null;
      short_code: string | null;
      creator_id: string | null;
    };

    // 認可: creator 本人 or システム管理者
    let allowed = event.creator_id === user.id;
    if (!allowed) {
      const { data: profile } = await admin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (profile?.is_admin) allowed = true;
    }
    if (!allowed) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    if (!event.creator_id) {
      return NextResponse.json({ error: "イベントに主催者が設定されていません" }, { status: 400 });
    }

    // 主催者のLINEアカウント
    const { data: la } = await admin
      .from("line_accounts")
      .select(
        "channel_access_token, owner_line_user_id, notify_line_user_ids, is_active"
      )
      .eq("user_id", event.creator_id)
      .maybeSingle();
    if (!la) {
      return NextResponse.json(
        { error: "主催者のLINE連携が未設定です。/settings/line で設定してください。" },
        { status: 400 }
      );
    }
    const account = la as {
      channel_access_token: string | null;
      owner_line_user_id: string | null;
      notify_line_user_ids: string[] | null;
      is_active: boolean;
    };
    if (!account.is_active || !account.channel_access_token) {
      return NextResponse.json(
        { error: "LINE連携が無効です" },
        { status: 400 }
      );
    }
    const recipients = (account.notify_line_user_ids?.length
      ? account.notify_line_user_ids
      : account.owner_line_user_id
      ? [account.owner_line_user_id]
      : []) as string[];
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "通知先が未登録です。/settings/line で通知先を登録してください。" },
        { status: 400 }
      );
    }

    // 確定済み参加者
    const { data: bookings } = await admin
      .from("bookings")
      .select("guest_name, attendance_format, created_at")
      .eq("event_id", event.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });

    const attendees = (bookings ?? []).map((b) => ({
      guest_name: (b as { guest_name: string }).guest_name,
      attendance_format: (b as { attendance_format?: string | null }).attendance_format ?? null,
    }));

    // 開催までの時間ラベル
    const nowMs = Date.now();
    const evMs = new Date(event.datetime).getTime();
    const hoursUntil = (evMs - nowMs) / (1000 * 60 * 60);
    const whenLabel =
      hoursUntil < 0
        ? "本日終了"
        : hoursUntil < 6
        ? "まもなく開催"
        : hoursUntil < 24
        ? "本日開催"
        : hoursUntil < 48
        ? "明日開催"
        : "近日開催";

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app";

    const flex = buildOrganizerAttendeeListFlex(
      {
        id: event.id,
        title: event.title,
        datetime: event.datetime,
        location: event.location,
        location_type: event.location_type,
        price: event.price,
        capacity: event.capacity,
        image_url: event.image_url,
        short_code: event.short_code,
      },
      attendees,
      baseUrl,
      whenLabel
    );
    const altText = `📋 ${whenLabel}: ${event.title}（${attendees.length}名参加）`;

    let result: { ok: true } | { ok: false; error: string };
    if (recipients.length === 1) {
      result = await pushFlexMessage(
        account.channel_access_token,
        recipients[0],
        altText,
        flex
      );
    } else {
      result = await multicastFlexMessage(
        account.channel_access_token,
        recipients,
        altText,
        flex
      );
    }

    if (!result.ok) {
      return NextResponse.json(
        { error: `LINE送信に失敗しました: ${result.error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      attendees_count: attendees.length,
      recipients_count: recipients.length,
      when_label: whenLabel,
    });
  } catch (err) {
    console.error("[send-attendee-list] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "サーバーエラー" },
      { status: 500 }
    );
  }
}
