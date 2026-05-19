import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { sendReminderForOffset, offsetLabel } from "@/lib/reminder-sender";

const bodySchema = z.object({
  offset_hours: z.number().int().min(0).max(24 * 60),
  /** trueなら既送信ログを上書きして再送 */
  force: z.boolean().optional().default(true),
});

// POST /api/events/[id]/reminders/test
// 指定 offset の リマインダーを今すぐ送信する。
// cron を待たずに動作確認できる管理者専用の手動トリガー。
export async function POST(
  request: NextRequest,
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
    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "offset_hours を指定してください" },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const admin = createAdminClient();
    const { data: event, error: evErr } = await admin
      .from("events")
      .select(
        "id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, price, capacity, image_url, short_code, creator_id, reminder_schedule"
      )
      .eq("id", id)
      .single();
    if (evErr || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://petit-event-maker-am.vercel.app";

    const sent = await sendReminderForOffset(
      admin,
      event as Parameters<typeof sendReminderForOffset>[1],
      parsed.data.offset_hours,
      {
        baseUrl,
        timeLabel: offsetLabel(parsed.data.offset_hours),
        force: parsed.data.force,
      }
    );

    return NextResponse.json({
      ok: true,
      sent,
      offset_hours: parsed.data.offset_hours,
    });
  } catch (err) {
    console.error("[reminders/test] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "サーバーエラー" },
      { status: 500 }
    );
  }
}
