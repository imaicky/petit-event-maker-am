import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/line/insights
// 主催者向けの LINE 管理ダッシュボード用集計データを返す。
//   - フォロワー数（is_following=true / false）
//   - 直近のリマインダー送信履歴（event_reminder_sends）
//   - 直近のブロードキャスト送信履歴（events.line_notified_at）
//   - 未紐付け参加者数（公開中で未来のイベントの確定参加者のうち
//     bookings.line_user_id が NULL のもの）
export async function GET(_request: NextRequest) {
  try {
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

    // LINEアカウント取得
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("id, channel_name, bot_basic_id, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount) {
      return NextResponse.json({
        hasAccount: false,
        followers: { active: 0, blocked: 0 },
        reminders: { recent: [] },
        broadcasts: { recent: [] },
        attendees: { unlinkedUpcoming: 0, totalUpcoming: 0 },
      });
    }

    const accId = (lineAccount as { id: string }).id;

    // フォロワー数（active / blocked）
    const { count: activeFollowers } = await admin
      .from("line_followers")
      .select("*", { count: "exact", head: true })
      .eq("line_account_id", accId)
      .eq("is_following", true);
    const { count: blockedFollowers } = await admin
      .from("line_followers")
      .select("*", { count: "exact", head: true })
      .eq("line_account_id", accId)
      .eq("is_following", false);

    // 主催イベント ID 一覧（直近・直近未来）
    const horizonPast = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: myEvents } = await admin
      .from("events")
      .select("id, title, datetime, is_published, line_notified_at, follower_notified_at")
      .eq("creator_id", user.id)
      .gte("datetime", horizonPast);

    const eventIds = (myEvents ?? []).map((e: { id: string }) => e.id);
    const eventTitleById = new Map<string, string>();
    for (const e of (myEvents ?? []) as Array<{ id: string; title: string }>) {
      eventTitleById.set(e.id, e.title);
    }

    // リマインダー送信履歴
    let recentReminders: Array<{
      event_id: string;
      event_title: string;
      offset_hours: number;
      sent_at: string;
      recipient_count: number;
      channel: string;
    }> = [];
    if (eventIds.length > 0) {
      try {
        const { data: sends } = await admin
          .from("event_reminder_sends")
          .select("event_id, offset_hours, sent_at, recipient_count, channel")
          .in("event_id", eventIds)
          .order("sent_at", { ascending: false })
          .limit(20);
        recentReminders = ((sends ?? []) as Array<{
          event_id: string;
          offset_hours: number;
          sent_at: string;
          recipient_count: number;
          channel: string;
        }>).map((s) => ({
          ...s,
          event_title: eventTitleById.get(s.event_id) ?? "(削除済み)",
        }));
      } catch {
        // 未マイグレーション環境では空配列
      }
    }

    // ブロードキャスト送信（events.line_notified_at が set されているもの）
    type EventRow = { id: string; title: string; line_notified_at: string | null };
    const broadcasts = ((myEvents ?? []) as EventRow[])
      .filter((e) => !!e.line_notified_at)
      .map((e) => ({
        event_id: e.id,
        event_title: e.title,
        sent_at: e.line_notified_at as string,
      }))
      .sort((a, b) => (a.sent_at < b.sent_at ? 1 : -1))
      .slice(0, 20);

    // 未紐付け参加者数（未来イベントの confirmed bookings で line_user_id が NULL のもの）
    let unlinkedUpcoming = 0;
    let totalUpcoming = 0;
    const futureEventIds = (myEvents ?? [])
      .filter((e: { datetime: string }) => new Date(e.datetime) > new Date())
      .map((e: { id: string }) => e.id);
    if (futureEventIds.length > 0) {
      const { count: totalCount } = await admin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("event_id", futureEventIds)
        .eq("status", "confirmed");
      totalUpcoming = totalCount ?? 0;

      try {
        const { count: unlinkedCount } = await admin
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .in("event_id", futureEventIds)
          .eq("status", "confirmed")
          .is("line_user_id", null);
        unlinkedUpcoming = unlinkedCount ?? 0;
      } catch {
        // 未マイグレーション環境
        unlinkedUpcoming = totalUpcoming;
      }
    }

    return NextResponse.json({
      hasAccount: true,
      account: {
        channelName: (lineAccount as { channel_name: string }).channel_name,
        botBasicId: (lineAccount as { bot_basic_id: string | null }).bot_basic_id,
        isActive: (lineAccount as { is_active: boolean }).is_active,
      },
      followers: {
        active: activeFollowers ?? 0,
        blocked: blockedFollowers ?? 0,
      },
      reminders: {
        recent: recentReminders,
      },
      broadcasts: {
        recent: broadcasts,
      },
      attendees: {
        unlinkedUpcoming,
        totalUpcoming,
      },
    });
  } catch (err) {
    console.error("[/api/line/insights] error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
