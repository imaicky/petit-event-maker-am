import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargetUser } from "@/lib/admin";
import { getLineBotInfo } from "@/lib/line";

// ─── POST /api/line/diagnose ────────────────────────────────
// 連携状態を診断して返す。UIで信号機表示するためのデータ。

type DiagnoseResult = {
  channel: {
    has_token: boolean;
    has_secret: boolean;
    bot_info_ok: boolean;
    bot_user_id: string | null;
    bot_basic_id: string | null;
    channel_name: string | null;
  };
  webhook: {
    last_event_at: string | null;
    last_error: string | null;
    last_signature_failed_at: string | null;
  };
  recipients: {
    owner: string | null;
    notify_count: number;
    notify_ids: string[];
    notify_on_booking: boolean;
  };
  warnings: string[];
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    let body: { target_user_id?: string | null } = {};
    try {
      body = await request.json();
    } catch {
      // body 省略可
    }

    let targetUserId: string;
    try {
      ({ targetUserId } = await resolveTargetUser(user.id, body.target_user_id ?? null));
    } catch {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: la } = await admin
      .from("line_accounts")
      .select(
        "id, channel_name, channel_access_token, channel_secret, bot_user_id, bot_basic_id, owner_line_user_id, notify_line_user_ids, notify_on_booking, is_active, last_webhook_event_at, last_webhook_error, last_webhook_signature_failed_at"
      )
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!la) {
      return NextResponse.json({ error: "LINE連携が未設定です" }, { status: 404 });
    }

    const account = la as {
      id: string;
      channel_name: string | null;
      channel_access_token: string | null;
      channel_secret: string | null;
      bot_user_id: string | null;
      bot_basic_id: string | null;
      owner_line_user_id: string | null;
      notify_line_user_ids: string[] | null;
      notify_on_booking: boolean;
      is_active: boolean;
      last_webhook_event_at: string | null;
      last_webhook_error: string | null;
      last_webhook_signature_failed_at: string | null;
    };

    // 疎通テスト
    let botInfoOk = false;
    if (account.channel_access_token) {
      const info = await getLineBotInfo(account.channel_access_token);
      botInfoOk = info.ok;
    }

    const notifyIds = account.notify_line_user_ids ?? [];

    const warnings: string[] = [];
    if (!account.channel_secret) {
      warnings.push("channel_secret が未設定。webhook署名検証が動きません。LINE Developers Consoleから取得して再連携してください。");
    }
    if (!botInfoOk && account.channel_access_token) {
      warnings.push("チャネルアクセストークンが無効です。LINE Developers Consoleで再発行してください。");
    }
    if (notifyIds.length === 0 && !account.owner_line_user_id) {
      warnings.push("通知先が未設定。少なくとも1人の通知先LINEユーザーIDを登録してください。");
    }
    if (!account.last_webhook_event_at) {
      warnings.push("webhookが一度も受信されていません。LINE Developers Consoleで Webhook URL と「Webhookの利用」を確認してください。");
    } else {
      const lastMs = new Date(account.last_webhook_event_at).getTime();
      if (Date.now() - lastMs > 24 * 60 * 60 * 1000) {
        warnings.push("webhook受信が24時間以上ありません。LINE側の設定変更や応答モード（Bot/チャット）を確認してください。");
      }
    }
    if (account.last_webhook_signature_failed_at) {
      warnings.push("最近webhookの署名検証に失敗しています。channel_secretの設定値を確認してください。");
    }
    if (!account.notify_on_booking) {
      warnings.push("「新規予約のLINE通知」設定が OFF になっています。");
    }
    if (!account.is_active) {
      warnings.push("LINE連携が無効化されています。");
    }

    const result: DiagnoseResult = {
      channel: {
        has_token: !!account.channel_access_token,
        has_secret: !!account.channel_secret,
        bot_info_ok: botInfoOk,
        bot_user_id: account.bot_user_id,
        bot_basic_id: account.bot_basic_id,
        channel_name: account.channel_name,
      },
      webhook: {
        last_event_at: account.last_webhook_event_at,
        last_error: account.last_webhook_error,
        last_signature_failed_at: account.last_webhook_signature_failed_at,
      },
      recipients: {
        owner: account.owner_line_user_id,
        notify_count: notifyIds.length,
        notify_ids: notifyIds,
        notify_on_booking: account.notify_on_booking,
      },
      warnings,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/line/diagnose] Unexpected error:", err);
    return NextResponse.json({ error: "診断に失敗しました" }, { status: 500 });
  }
}
