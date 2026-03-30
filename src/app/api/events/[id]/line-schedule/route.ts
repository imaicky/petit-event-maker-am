import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const body = await request.json().catch(() => ({}));

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です" },
        { status: 401 }
      );
    }

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    // Ownership check
    if (event.creator_id !== user.id) {
      return NextResponse.json(
        { error: "権限がありません" },
        { status: 403 }
      );
    }

    // Must be published
    if (!event.is_published) {
      return NextResponse.json(
        { error: "公開中のイベントのみ予約送信できます" },
        { status: 400 }
      );
    }

    // Already sent check
    if (event.line_notified_at) {
      return NextResponse.json(
        { error: "このイベントは既にLINE送信済みです" },
        { status: 409 }
      );
    }

    // LINE account check
    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("channel_access_token, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount?.is_active || !lineAccount.channel_access_token) {
      return NextResponse.json(
        { error: "LINE連携が設定されていません。設定画面からLINE公式アカウントを連携してください。" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Cancel mode
    if (body.cancel === true) {
      await admin
        .from("events")
        .update({
          line_scheduled_at: null,
          line_schedule_message: null,
        })
        .eq("id", eventId);

      return NextResponse.json({ success: true, cancelled: true });
    }

    // Schedule mode
    const scheduledAt = body.scheduled_at;
    if (!scheduledAt || typeof scheduledAt !== "string") {
      return NextResponse.json(
        { error: "送信予約日時を指定してください" },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: "無効な日時です" },
        { status: 400 }
      );
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: "予約日時は現在時刻より後を指定してください" },
        { status: 400 }
      );
    }

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    await admin
      .from("events")
      .update({
        line_scheduled_at: scheduledDate.toISOString(),
        line_schedule_message: message || null,
      })
      .eq("id", eventId);

    return NextResponse.json({
      success: true,
      scheduled_at: scheduledDate.toISOString(),
    });
  } catch (err) {
    console.error("[POST /api/events/[id]/line-schedule] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
