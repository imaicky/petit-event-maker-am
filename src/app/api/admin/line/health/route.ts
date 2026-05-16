import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/line/health ──────────────────────────────
// システム管理者専用。全 line_accounts の健全性レポート。

type HealthRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  channel_name: string | null;
  has_token: boolean;
  has_secret: boolean;
  has_owner: boolean;
  notify_count: number;
  notify_on_booking: boolean;
  is_active: boolean;
  last_webhook_event_at: string | null;
  last_webhook_error: string | null;
  last_webhook_signature_failed_at: string | null;
  status: "ok" | "warning" | "critical";
  status_reasons: string[];
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const { data: accounts, error } = await admin
      .from("line_accounts")
      .select(
        "user_id, channel_name, channel_access_token, channel_secret, bot_user_id, owner_line_user_id, notify_line_user_ids, notify_on_booking, is_active, last_webhook_event_at, last_webhook_error, last_webhook_signature_failed_at"
      );

    if (error) {
      console.error("[GET /api/admin/line/health] Supabase error:", error);
      return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
    }

    const userIds = (accounts ?? []).map((a) => a.user_id as string);
    let profileMap = new Map<string, { username: string | null; display_name: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, username, display_name")
        .in("id", userIds);
      profileMap = new Map(
        (profiles ?? []).map((p) => [
          p.id as string,
          { username: p.username as string | null, display_name: p.display_name as string | null },
        ])
      );
    }

    const rows: HealthRow[] = (accounts ?? []).map((a) => {
      const account = a as {
        user_id: string;
        channel_name: string | null;
        channel_access_token: string | null;
        channel_secret: string | null;
        bot_user_id: string | null;
        owner_line_user_id: string | null;
        notify_line_user_ids: string[] | null;
        notify_on_booking: boolean;
        is_active: boolean;
        last_webhook_event_at: string | null;
        last_webhook_error: string | null;
        last_webhook_signature_failed_at: string | null;
      };
      const notifyCount = (account.notify_line_user_ids ?? []).length;
      const hasToken = !!account.channel_access_token;
      const hasSecret = !!account.channel_secret;
      const hasOwner = !!account.owner_line_user_id;
      const recipientsOk = notifyCount > 0 || hasOwner;

      const reasons: string[] = [];
      let status: HealthRow["status"] = "ok";

      if (!hasToken || !account.bot_user_id) {
        status = "critical";
        reasons.push("チャネルアクセストークン未設定");
      }
      if (!hasSecret) {
        if (status !== "critical") status = "warning";
        reasons.push("channel_secret未設定（webhook署名検証不可）");
      }
      if (!recipientsOk) {
        if (status !== "critical") status = "warning";
        reasons.push("通知先未設定");
      }
      if (!account.notify_on_booking) {
        if (status !== "critical") status = "warning";
        reasons.push("通知設定がOFF");
      }
      if (account.last_webhook_signature_failed_at) {
        if (status === "ok") status = "warning";
        reasons.push("最近webhook署名検証に失敗あり");
      }
      if (!account.is_active) {
        status = "critical";
        reasons.push("LINE連携が無効化");
      }

      const prof = profileMap.get(account.user_id);

      return {
        user_id: account.user_id,
        username: prof?.username ?? null,
        display_name: prof?.display_name ?? null,
        channel_name: account.channel_name,
        has_token: hasToken,
        has_secret: hasSecret,
        has_owner: hasOwner,
        notify_count: notifyCount,
        notify_on_booking: account.notify_on_booking,
        is_active: account.is_active,
        last_webhook_event_at: account.last_webhook_event_at,
        last_webhook_error: account.last_webhook_error,
        last_webhook_signature_failed_at: account.last_webhook_signature_failed_at,
        status,
        status_reasons: reasons,
      };
    });

    const summary = {
      total: rows.length,
      ok: rows.filter((r) => r.status === "ok").length,
      warning: rows.filter((r) => r.status === "warning").length,
      critical: rows.filter((r) => r.status === "critical").length,
    };

    return NextResponse.json({ summary, rows });
  } catch (err) {
    console.error("[GET /api/admin/line/health] Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
