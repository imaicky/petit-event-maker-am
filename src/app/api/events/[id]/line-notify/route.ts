import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  broadcastFlexMessage,
  broadcastLineMessage,
  buildEventFlexBubble,
} from "@/lib/line";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Parse body first (stream can only be consumed once)
    const body = await request.json().catch(() => ({}));
    const customMessage = typeof body.message === "string" ? body.message.trim() : "";

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
        { error: "公開中のイベントのみ送信できます" },
        { status: 400 }
      );
    }

    // Duplicate check
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

    // Get booking count for flex card
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmed");

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://petit-event-maker-am.vercel.app";

    // Send custom text message first (if provided)
    if (customMessage) {
      const textResult = await broadcastLineMessage(
        lineAccount.channel_access_token,
        customMessage
      );
      if (!textResult.ok) {
        return NextResponse.json(
          { error: `LINE送信に失敗しました: ${textResult.error}` },
          { status: 502 }
        );
      }
    }

    // Send Flex Message card
    const bubble = buildEventFlexBubble(
      { ...event, booking_count: bookingCount ?? 0 },
      baseUrl
    );
    const flexResult = await broadcastFlexMessage(
      lineAccount.channel_access_token,
      `🎉 新しいイベント: ${event.title}`,
      bubble
    );

    if (!flexResult.ok) {
      return NextResponse.json(
        { error: `LINE送信に失敗しました: ${flexResult.error}` },
        { status: 502 }
      );
    }

    // Update line_notified_at using admin client to bypass RLS
    const admin = createAdminClient();
    await admin
      .from("events")
      .update({ line_notified_at: new Date().toISOString() })
      .eq("id", eventId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/events/[id]/line-notify] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
