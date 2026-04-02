import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  broadcastFlexMessage,
  broadcastLineMessage,
  multicastFlexMessage,
  multicastLineMessage,
  buildMenuFlexBubble,
} from "@/lib/line";

type SegmentParam = "all" | "applicants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: menuId } = await params;

    const body = await request.json().catch(() => ({}));
    const customMessage = typeof body.message === "string" ? body.message.trim() : "";
    const segment: SegmentParam =
      body.segment === "applicants" ? "applicants" : "all";

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

    // Fetch menu
    const admin = createAdminClient();
    const { data: menu, error: menuError } = await admin
      .from("menus")
      .select("*")
      .eq("id", menuId)
      .single();

    if (menuError || !menu) {
      return NextResponse.json(
        { error: "メニューが見つかりません" },
        { status: 404 }
      );
    }

    // Ownership check
    if (menu.creator_id !== user.id) {
      return NextResponse.json(
        { error: "権限がありません" },
        { status: 403 }
      );
    }

    // Must be published
    if (!menu.is_published) {
      return NextResponse.json(
        { error: "公開中のメニューのみ送信できます" },
        { status: 400 }
      );
    }

    // LINE account check
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("id, channel_access_token, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount?.is_active || !lineAccount.channel_access_token) {
      return NextResponse.json(
        { error: "LINE連携が設定されていません。設定画面からLINE公式アカウントを連携してください。" },
        { status: 400 }
      );
    }

    // Get booking count for flex card
    const { count: bookingCount } = await admin
      .from("menu_bookings")
      .select("*", { count: "exact", head: true })
      .eq("menu_id", menuId)
      .eq("status", "confirmed");

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://petit-event-maker-am.vercel.app";

    const bubble = buildMenuFlexBubble(
      { ...menu, booking_count: bookingCount ?? 0 },
      baseUrl
    );

    if (segment === "all") {
      // Broadcast to all followers
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

      const flexResult = await broadcastFlexMessage(
        lineAccount.channel_access_token,
        `🏷️ メニュー案内: ${menu.title}`,
        bubble
      );

      if (!flexResult.ok) {
        return NextResponse.json(
          { error: `LINE送信に失敗しました: ${flexResult.error}` },
          { status: 502 }
        );
      }
    } else {
      // Applicants segment — get menu booking users who are LINE followers
      const { data: bookings } = await admin
        .from("menu_bookings")
        .select("user_id")
        .eq("menu_id", menuId)
        .eq("status", "confirmed")
        .not("user_id", "is", null);

      const userIds = (bookings ?? [])
        .map((b: { user_id: string | null }) => b.user_id)
        .filter(Boolean) as string[];

      let targetUserIds: string[] = [];

      if (userIds.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("line_user_id")
          .in("id", userIds)
          .not("line_user_id", "is", null);

        const lineUserIds = (profiles ?? [])
          .map((p: { line_user_id: string | null }) => p.line_user_id)
          .filter(Boolean) as string[];

        if (lineUserIds.length > 0) {
          const { data: followers } = await admin
            .from("line_followers")
            .select("line_user_id")
            .eq("line_account_id", lineAccount.id)
            .eq("is_following", true)
            .in("line_user_id", lineUserIds);

          targetUserIds = (followers ?? []).map(
            (f: { line_user_id: string }) => f.line_user_id
          );
        }
      }

      if (targetUserIds.length === 0) {
        return NextResponse.json(
          { error: "対象のLINEフォロワーが見つかりませんでした" },
          { status: 404 }
        );
      }

      if (customMessage) {
        const textResult = await multicastLineMessage(
          lineAccount.channel_access_token,
          targetUserIds,
          customMessage
        );
        if (!textResult.ok) {
          return NextResponse.json(
            { error: `LINE送信に失敗しました: ${textResult.error}` },
            { status: 502 }
          );
        }
      }

      const flexResult = await multicastFlexMessage(
        lineAccount.channel_access_token,
        targetUserIds,
        `🏷️ ${menu.title}`,
        bubble
      );

      if (!flexResult.ok) {
        return NextResponse.json(
          { error: `LINE送信に失敗しました: ${flexResult.error}` },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/menus/[id]/line-notify] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
