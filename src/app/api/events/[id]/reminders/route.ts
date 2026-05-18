import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";

// GET /api/events/[id]/reminders
// 該当イベントのリマインダー送信履歴を返す。編集ページのステータス表示用。
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const hasAccess = await canManageEvent(supabase, id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const admin = createAdminClient();
    try {
      const { data } = await admin
        .from("event_reminder_sends")
        .select("offset_hours, sent_at, recipient_count, channel")
        .eq("event_id", id)
        .order("sent_at", { ascending: false });
      return NextResponse.json({ history: data ?? [] });
    } catch {
      // テーブル未マイグレーション環境では空で返す
      return NextResponse.json({ history: [] });
    }
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
