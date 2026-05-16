import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargetUser } from "@/lib/admin";
import { pushLineMessage } from "@/lib/line";

// ─── POST /api/line/test-push ────────────────────────────────
// 設定済み通知先へテストpushを送信する。
// recipient: "all" → notify_line_user_ids 全員 / "owner" → owner_line_user_id
// または具体的な line_user_id 単体送信

type PushResult = { line_user_id: string; ok: boolean; error?: string };

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as {
      target_user_id?: string | null;
      recipient?: "all" | "owner" | string;
    };

    let targetUserId: string;
    try {
      ({ targetUserId } = await resolveTargetUser(user.id, body.target_user_id ?? null));
    } catch {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: la } = await admin
      .from("line_accounts")
      .select("channel_access_token, owner_line_user_id, notify_line_user_ids, is_active")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!la) {
      return NextResponse.json({ error: "LINE連携が未設定です" }, { status: 404 });
    }
    const account = la as {
      channel_access_token: string | null;
      owner_line_user_id: string | null;
      notify_line_user_ids: string[] | null;
      is_active: boolean;
    };
    if (!account.channel_access_token) {
      return NextResponse.json({ error: "チャネルアクセストークンが未設定です" }, { status: 400 });
    }
    if (!account.is_active) {
      return NextResponse.json({ error: "LINE連携が無効です" }, { status: 400 });
    }

    let targets: string[] = [];
    if (body.recipient === "all") {
      targets = account.notify_line_user_ids ?? [];
      if (targets.length === 0 && account.owner_line_user_id) {
        targets = [account.owner_line_user_id];
      }
    } else if (body.recipient === "owner") {
      targets = account.owner_line_user_id ? [account.owner_line_user_id] : [];
    } else if (typeof body.recipient === "string" && body.recipient.length > 0) {
      targets = [body.recipient];
    }

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "送信先が見つかりません。通知先LINEユーザーIDを登録してください。" },
        { status: 400 }
      );
    }

    const message =
      "🔔 プチイベント作成くん 通知テスト\n\nこのメッセージが届けば設定は正しく完了しています。\nここに新規予約や決済完了の通知が届きます。";

    const results: PushResult[] = [];
    for (const id of targets) {
      const r = await pushLineMessage(account.channel_access_token, id, message);
      results.push({ line_user_id: id, ok: r.ok, error: r.ok ? undefined : r.error });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[POST /api/line/test-push] Unexpected error:", err);
    return NextResponse.json({ error: "テスト送信に失敗しました" }, { status: 500 });
  }
}
