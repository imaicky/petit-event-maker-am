import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargetUser } from "@/lib/admin";
import { pushLineMessage } from "@/lib/line";

// ─── /api/line/notify-recipients ─────────────────────────────
// notify_line_user_ids を直接編集する。
// フォロワー一覧に未登録のLINE User IDも、pushLineMessage の pre-flight で
// 友だち追加済みかチェックしてから受け入れる。

const LINE_USER_ID_RE = /^U[0-9a-fA-F]{32}$/;

const bodySchema = z.object({
  action: z.enum(["add", "remove"]),
  line_user_id: z
    .string()
    .min(1)
    .regex(LINE_USER_ID_RE, "LINEユーザーIDは U で始まる33文字の英数字です"),
  target_user_id: z.string().optional().nullable(),
  // pre-flight push チェックをスキップしたいとき（既存ID削除など）に使う
  skip_preflight: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const first =
        fieldErrors.line_user_id?.[0] ??
        fieldErrors.action?.[0] ??
        "入力内容に誤りがあります";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    const { action, line_user_id, target_user_id } = parsed.data;

    let targetUserId: string;
    try {
      ({ targetUserId } = await resolveTargetUser(user.id, target_user_id ?? null));
    } catch {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: la } = await admin
      .from("line_accounts")
      .select("id, channel_access_token, owner_line_user_id, notify_line_user_ids, is_active")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!la) {
      return NextResponse.json({ error: "LINE連携が未設定です" }, { status: 404 });
    }
    const account = la as {
      id: string;
      channel_access_token: string | null;
      owner_line_user_id: string | null;
      notify_line_user_ids: string[] | null;
      is_active: boolean;
    };

    const current = account.notify_line_user_ids ?? [];
    let next: string[];

    if (action === "add") {
      if (!account.channel_access_token) {
        return NextResponse.json(
          { error: "チャネルアクセストークンが未設定です" },
          { status: 400 }
        );
      }

      // 既に登録済みなら何もしない
      if (current.includes(line_user_id)) {
        return NextResponse.json({
          notify_line_user_ids: current,
          owner_line_user_id: account.owner_line_user_id,
          already_registered: true,
        });
      }

      // pre-flight: 友だち追加されているか、トークンが有効か、を実push試行で確認。
      // failed なら DB を更新しない（不正なID保存を防ぐ）。
      if (!parsed.data.skip_preflight) {
        const r = await pushLineMessage(
          account.channel_access_token,
          line_user_id,
          "✅ 通知先として登録されました\n\nこのアカウントに新規予約・決済完了の通知が届きます。\n\n停止するには「通知OFF」と送信するか、設定画面で削除してください。"
        );
        if (!r.ok) {
          // LINE側の典型エラー: 401 Invalid token / 403 Forbidden（友だち未追加）
          return NextResponse.json(
            {
              error:
                "このLINEユーザーIDに通知できませんでした。LINE公式アカウントを友だち追加しているか、IDが正しいか確認してください。",
              detail: r.error,
            },
            { status: 400 }
          );
        }
      }

      next = [...current, line_user_id];

      // owner_line_user_id が空ならついでにセット（後方互換用）
      const updates: Record<string, unknown> = { notify_line_user_ids: next };
      if (!account.owner_line_user_id) {
        updates.owner_line_user_id = line_user_id;
      }
      const { error: updErr } = await admin
        .from("line_accounts")
        .update(updates)
        .eq("id", account.id);
      if (updErr) {
        return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
      }

      return NextResponse.json({
        notify_line_user_ids: next,
        owner_line_user_id: updates.owner_line_user_id ?? account.owner_line_user_id,
      });
    } else {
      // remove
      next = current.filter((id) => id !== line_user_id);
      const updates: Record<string, unknown> = { notify_line_user_ids: next };
      // owner_line_user_id と一致するなら、配列の先頭か NULL に振り直す
      if (account.owner_line_user_id === line_user_id) {
        updates.owner_line_user_id = next.length > 0 ? next[0] : null;
      }
      const { error: updErr } = await admin
        .from("line_accounts")
        .update(updates)
        .eq("id", account.id);
      if (updErr) {
        return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
      }

      return NextResponse.json({
        notify_line_user_ids: next,
        owner_line_user_id: updates.owner_line_user_id ?? account.owner_line_user_id,
      });
    }
  } catch (err) {
    console.error("[POST /api/line/notify-recipients] Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
