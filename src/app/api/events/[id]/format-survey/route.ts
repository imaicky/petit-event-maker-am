import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { sendBatchEmails } from "@/lib/email";
import { buildFormatSurveyEmailHtml } from "@/lib/email-templates";
import { signSurveyToken } from "@/lib/format-survey-token";

// ─── POST /api/events/[id]/format-survey ─────────────────────────
// 主催者の操作で、confirmed 予約者全員に参加形式アンケートを送る。
// 各メールには予約者ごとに署名されたワンクリック確定URL（リアル/オンライン）が含まれる。
//
// レート制限と履歴は既存の event_messages テーブルを流用（メッセージ送信と同じ）。

const DAILY_LIMIT = 5;

function formatDatetime(iso: string | null): string {
  if (!iso) return "未定";
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

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://petit-event-maker-am.vercel.app"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  void request;
  const { id: eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const hasAccess = await canManageEvent(supabase, eventId, user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "このイベントへのアクセス権がありません" },
      { status: 403 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "サーバー設定が不足しています" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  // イベント情報
  const { data: event } = await admin
    .from("events")
    .select("id, title, datetime, location, location_type")
    .eq("id", eventId)
    .single();
  if (!event) {
    return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
  }
  if (event.location_type !== "hybrid") {
    return NextResponse.json(
      { error: "ハイブリッド開催のイベントでのみ送信できます" },
      { status: 400 }
    );
  }

  // レート制限 (event_messages を流用)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count: todayCount } = await admin
    .from("event_messages")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("sender_id", user.id)
    .gte("created_at", todayStart.toISOString());
  if ((todayCount ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `1日のメッセージ送信上限（${DAILY_LIMIT}通）に達しました。明日以降に再度お試しください。`,
      },
      { status: 429 }
    );
  }

  // 受信者: confirmed 予約 + メールあり
  const { data: bookings } = await admin
    .from("bookings")
    .select("id, guest_name, guest_email")
    .eq("event_id", eventId)
    .eq("status", "confirmed");

  const recipients = (bookings ?? []).filter(
    (b): b is { id: string; guest_name: string; guest_email: string } =>
      !!b.guest_email && b.guest_email.includes("@")
  );

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "送信先の参加者がいません" },
      { status: 400 }
    );
  }

  const subject = `【ご確認】${(event as { title: string }).title} の参加形式を教えてください`;
  const dateStr = formatDatetime((event as { datetime: string | null }).datetime ?? null);
  const location =
    (event as { location: string | null }).location ?? "（オンライン併用）";

  let sent = 0;
  const errors: string[] = [];

  // 1通ずつ送る（per-recipient で URL が異なるため一括 BCC は使えない）
  // Resend の単発送信を Promise.all で並列。大量送信時はバッチ化が望ましいが、
  // typical な参加者数 (~100) では十分。
  await Promise.all(
    recipients.map(async (r) => {
      try {
        const physicalUrl = `${baseUrl()}/api/bookings/confirm-format?t=${encodeURIComponent(
          signSurveyToken(r.id, "physical")
        )}`;
        const onlineUrl = `${baseUrl()}/api/bookings/confirm-format?t=${encodeURIComponent(
          signSurveyToken(r.id, "online")
        )}`;
        const html = buildFormatSurveyEmailHtml(
          r.guest_name,
          (event as { title: string }).title,
          dateStr,
          location,
          physicalUrl,
          onlineUrl
        );
        if (process.env.RESEND_API_KEY) {
          await sendBatchEmails({
            to: [r.guest_email],
            subject,
            html,
          });
        }
        sent += 1;
      } catch (e) {
        errors.push(
          `${r.guest_email}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    })
  );

  // 履歴を保存（既存 message と同じテーブル、subject に印を付ける）
  await admin.from("event_messages").insert({
    event_id: eventId,
    sender_id: user.id,
    subject,
    body: "[format-survey] 参加形式アンケートメールを送信",
    recipient_count: sent,
  });

  return NextResponse.json({
    ok: true,
    sent,
    total: recipients.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
