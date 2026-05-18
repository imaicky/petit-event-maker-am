import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  broadcastFlexMessage,
  broadcastLineMessage,
  multicastFlexMessage,
  multicastLineMessage,
  buildEventFlexBubble,
  pushFlexMessage,
  pushLineMessage,
} from "@/lib/line";
import { canManageEvent } from "@/lib/check-event-access";

type SegmentParam =
  | "all"
  | "attendees"
  | { tags: string[] };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // Parse body first (stream can only be consumed once)
    const body = await request.json().catch(() => ({}));
    const customMessage = typeof body.message === "string" ? body.message.trim() : "";
    // テスト送信フラグ: 主催者の owner_line_user_id + notify_line_user_ids のみに送る
    const isTestMode = body.test === true;
    // Validate segment
    let segment: SegmentParam = "all";
    if (body.segment === "attendees") {
      segment = "attendees";
    } else if (
      typeof body.segment === "object" &&
      body.segment !== null &&
      Array.isArray(body.segment.tags) &&
      body.segment.tags.every((t: unknown) => typeof t === "string")
    ) {
      segment = { tags: body.segment.tags };
    }

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

    // Access check (creator or co-admin)
    const hasAccess = await canManageEvent(supabase, eventId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "権限がありません" },
        { status: 403 }
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

    // Must be published — テストモードでは下書きでもOK
    if (!isTestMode && !event.is_published) {
      return NextResponse.json(
        { error: "公開中のイベントのみ送信できます" },
        { status: 400 }
      );
    }

    // Duplicate check (only for "all" segment) — テストモードでは再送可
    if (!isTestMode && segment === "all" && event.line_notified_at) {
      return NextResponse.json(
        { error: "このイベントは既にLINE送信済みです" },
        { status: 409 }
      );
    }

    // LINE account check — テストモードでは owner_line_user_id / notify_line_user_ids も取得
    const admin = createAdminClient();
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select(
        "id, channel_access_token, is_active, owner_line_user_id, notify_line_user_ids"
      )
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

    const bubble = buildEventFlexBubble(
      { ...event, booking_count: bookingCount ?? 0 },
      baseUrl
    );

    // ─── Test mode: 主催者のLINEだけに push する ─────────────
    if (isTestMode) {
      const la = lineAccount as {
        owner_line_user_id?: string | null;
        notify_line_user_ids?: string[] | null;
      };
      const adminIds = new Set<string>();
      if (la.owner_line_user_id) adminIds.add(la.owner_line_user_id);
      for (const id of la.notify_line_user_ids ?? []) adminIds.add(id);
      const ids = Array.from(adminIds);
      if (ids.length === 0) {
        return NextResponse.json(
          {
            error:
              "テスト送信先が見つかりません。設定 → LINE → 通知先で『LINEで本人確認して登録』してください。",
          },
          { status: 400 }
        );
      }
      const altText = `🧪 [テスト] 🎉 ${event.title}`;
      const testMessage = customMessage
        ? `🧪 [テスト送信]\n${customMessage}`
        : `🧪 [テスト送信] イベント通知のプレビューです`;
      let sent = 0;
      const errors: string[] = [];
      for (const userId of ids) {
        try {
          const textRes = await pushLineMessage(
            lineAccount.channel_access_token,
            userId,
            testMessage
          );
          if (!textRes.ok) errors.push(`${userId} text: ${textRes.error}`);
          const flexRes = await pushFlexMessage(
            lineAccount.channel_access_token,
            userId,
            altText,
            bubble
          );
          if (!flexRes.ok) {
            errors.push(`${userId} flex: ${flexRes.error}`);
          } else {
            sent++;
          }
        } catch (err) {
          errors.push(
            `${userId}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }
      if (sent === 0) {
        return NextResponse.json(
          {
            error: `テスト送信に失敗しました${errors.length > 0 ? `: ${errors[0]}` : ""}`,
          },
          { status: 502 }
        );
      }
      return NextResponse.json({
        ok: true,
        test: true,
        sent,
        skipped: errors.length,
      });
    }

    // Determine target user IDs for segment delivery
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
        `🎉 新しいイベント: ${event.title}`,
        bubble
      );

      if (!flexResult.ok) {
        return NextResponse.json(
          { error: `LINE送信に失敗しました: ${flexResult.error}` },
          { status: 502 }
        );
      }

      // Update line_notified_at
      await admin
        .from("events")
        .update({
          line_notified_at: new Date().toISOString(),
          line_scheduled_at: null,
          line_schedule_message: null,
        })
        .eq("id", eventId);
    } else {
      // Segment delivery — get target LINE user IDs
      let targetUserIds: string[] = [];

      if (segment === "attendees") {
        // Get attendees who are also LINE followers
        const { data: bookings } = await admin
          .from("bookings")
          .select("user_id")
          .eq("event_id", eventId)
          .eq("status", "confirmed")
          .not("user_id", "is", null);

        const userIds = (bookings ?? [])
          .map((b: { user_id: string | null }) => b.user_id)
          .filter(Boolean) as string[];

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
      } else if (typeof segment === "object" && segment.tags?.length > 0) {
        // Get followers with matching tags
        const { data: followers } = await admin
          .from("line_followers")
          .select("line_user_id")
          .eq("line_account_id", lineAccount.id)
          .eq("is_following", true)
          .overlaps("tags", segment.tags);

        targetUserIds = (followers ?? []).map(
          (f: { line_user_id: string }) => f.line_user_id
        );
      }

      if (targetUserIds.length === 0) {
        return NextResponse.json(
          { error: "対象のLINEフォロワーが見つかりませんでした" },
          { status: 404 }
        );
      }

      // Send via multicast
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
        `🎉 ${event.title}`,
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
    console.error("[POST /api/events/[id]/line-notify] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
