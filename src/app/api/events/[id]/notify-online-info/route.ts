import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { canManageEvent } from "@/lib/check-event-access";

// ─── POST /api/events/[id]/notify-online-info ────────────────
// イベントのオンライン参加情報を、既存の確定済み参加者に一斉メール送信。
// （後からZoomURL等を追加・変更した時に使う）

function formatDatetime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return iso;
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const hasAccess = await canManageEvent(supabase, eventId, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  // 任意の本文追加
  const body = (await request.json().catch(() => ({}))) as {
    extra_message?: string;
    target?: "all" | "online_only";
  };
  const extraMessage = (body.extra_message ?? "").trim();
  const target = body.target ?? "all";

  const admin = createAdminClient();

  // イベント取得
  const { data: ev } = await admin
    .from("events")
    .select(
      "id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, location_url, short_code"
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
    online_url: string | null;
    zoom_meeting_id: string | null;
    zoom_passcode: string | null;
    location_url: string | null;
    short_code: string | null;
  };

  if (event.location_type !== "online" && event.location_type !== "hybrid") {
    return NextResponse.json(
      { error: "このイベントはオンライン参加形式ではありません" },
      { status: 400 }
    );
  }

  if (!event.online_url && !event.zoom_meeting_id) {
    return NextResponse.json(
      { error: "オンライン参加情報（URL or Zoom ID）が未設定です。先にイベント編集画面で入力してください。" },
      { status: 400 }
    );
  }

  // 参加者取得（確定済み・有効なメール）
  // hybrid の場合は target="online_only" でオンライン参加者のみ抽出する選択肢を提供
  let bookingsQuery = admin
    .from("bookings")
    .select("guest_name, guest_email, attendance_format")
    .eq("event_id", eventId)
    .eq("status", "confirmed");
  if (event.location_type === "hybrid" && target === "online_only") {
    bookingsQuery = bookingsQuery.eq("attendance_format", "online");
  }
  const { data: bookings } = await bookingsQuery;
  const recipients = (bookings ?? [])
    .map((b) => b as { guest_name: string; guest_email: string; attendance_format: string | null })
    .filter((b) => !!b.guest_email);

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "送信対象の参加者がいません" },
      { status: 400 }
    );
  }

  // オンライン情報メール本文
  const dateStr = formatDatetime(event.datetime);
  const onlineLines: string[] = [];
  if (event.zoom_meeting_id) {
    onlineLines.push(`■ ZoomミーティングID：${event.zoom_meeting_id}`);
    if (event.zoom_passcode) onlineLines.push(`■ Zoomパスコード：${event.zoom_passcode}`);
  }
  if (event.online_url) {
    onlineLines.push(`■ オンラインURL：${event.online_url}`);
  }

  const eventUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app"}/events/${event.id}`;
  const subject = `【オンライン参加情報のお知らせ】${event.title}`;

  // 一斉送信（per recipient で個別化）
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of recipients) {
    try {
      const body = `${r.guest_name} 様

${event.title} のオンライン参加情報をお知らせします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ イベント：${event.title}
■ 日時：${dateStr}
${onlineLines.join("\n")}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${extraMessage ? `主催者からのメッセージ:\n${extraMessage}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` : ""}イベント詳細はこちら:
${eventUrl}

当日のご参加をお待ちしております。

プチイベント作成くん`;

      // notification log（重複監視・送信履歴）
      await admin.from("notifications").insert({
        recipient_email: r.guest_email,
        type: "online_info_update",
        subject,
        body,
      });

      if (process.env.RESEND_API_KEY) {
        await sendBatchEmails({
          to: [r.guest_email],
          subject,
          html: wrapInHtml(body, event.title),
        });
      }
      sent++;
    } catch (e) {
      failed++;
      errors.push(`${r.guest_email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    total: recipients.length,
    errors: errors.slice(0, 10),
  });
}
