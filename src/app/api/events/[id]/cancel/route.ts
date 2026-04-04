import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ─── Validation ──────────────────────────────────────────────

const cancelSchema = z.object({
  booking_id: z.string().min(1, "予約IDが必要です"),
});

// ─── Helpers ─────────────────────────────────────────────────

function checkEnvVars(): NextResponse | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { error: "Supabase環境変数が設定されていません。.env.localを確認してください。" },
      { status: 503 }
    );
  }
  return null;
}

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

// ─── POST /api/events/[id]/cancel ────────────────────────────

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id: eventId } = await props.params;
    const supabase = await createClient();

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, datetime, location")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "booking_idが必要です" },
        { status: 400 }
      );
    }

    const { booking_id } = parsed.data;

    // Fetch the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, event_id, guest_name, guest_email, status")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 }
      );
    }

    if (booking.event_id !== eventId) {
      return NextResponse.json(
        { error: "予約がこのイベントに属していません" },
        { status: 400 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "この予約はすでにキャンセル済みです" },
        { status: 409 }
      );
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking_id);

    if (updateError) {
      console.error("[POST /api/events/[id]/cancel] Update error:", updateError);
      return NextResponse.json(
        { error: "キャンセルの処理に失敗しました" },
        { status: 500 }
      );
    }

    // Send cancellation notification (fire-and-forget)
    const dateStr = formatDatetime(event.datetime);
    const subject = `【キャンセル完了】${event.title}`;
    const body_text = `${booking.guest_name} 様

${event.title} のご予約をキャンセルしました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約番号：${booking.id}
■ イベント：${event.title}
■ 日時：${dateStr}
■ キャンセル日時：${formatDatetime(new Date().toISOString())}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

またのご利用をお待ちしております。

プチイベント作成くん`;

    supabase
      .from("notifications")
      .insert({
        recipient_email: booking.guest_email,
        type: "booking_cancellation",
        subject,
        body: body_text,
      })
      .then(({ error }) => {
        if (error) console.error("[cancel] notification insert error:", error);
      });

    return NextResponse.json({ success: true, booking_id });
  } catch (err) {
    console.error("[POST /api/events/[id]/cancel] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
