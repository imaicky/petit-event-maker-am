import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargetUser } from "@/lib/admin";
import { getLineUserProfile } from "@/lib/line";

// ─── POST /api/line/notify-recipients/refresh-profile ────────
// 「プロフィール未取得」と表示されている通知先のプロフィールを
// LINE Bot API (/v2/bot/profile/{userId}) から取得して line_followers に
// upsert する。公式アカウントを友だち追加してくれていれば成功する。
//
// body:
//   { line_user_id?: string, target_user_id?: string }
//   line_user_id を省略すると、未取得状態のすべての notify_line_user_ids を一括更新する。

const LINE_USER_ID_RE = /^U[0-9a-fA-F]{32}$/;

const bodySchema = z.object({
  line_user_id: z.string().regex(LINE_USER_ID_RE).optional(),
  target_user_id: z.string().optional().nullable(),
});

type RefreshResult = {
  line_user_id: string;
  ok: boolean;
  display_name?: string | null;
  error?: string;
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

    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "入力内容に誤りがあります" },
        { status: 400 }
      );
    }
    const { line_user_id, target_user_id } = parsed.data;

    let targetUserId: string;
    try {
      ({ targetUserId } = await resolveTargetUser(user.id, target_user_id ?? null));
    } catch {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const admin = createAdminClient();

    const { data: la } = await admin
      .from("line_accounts")
      .select("id, channel_access_token, notify_line_user_ids")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!la) {
      return NextResponse.json(
        { error: "LINEアカウントが登録されていません" },
        { status: 404 }
      );
    }
    const account = la as {
      id: string;
      channel_access_token: string | null;
      notify_line_user_ids: string[] | null;
    };
    if (!account.channel_access_token) {
      return NextResponse.json(
        { error: "チャネルアクセストークンが未設定です" },
        { status: 400 }
      );
    }

    // 更新対象のIDを決定
    let targets: string[];
    if (line_user_id) {
      // 指定IDが登録済みかだけ確認
      if (!(account.notify_line_user_ids ?? []).includes(line_user_id)) {
        return NextResponse.json(
          { error: "そのLINEユーザーIDは通知先に登録されていません" },
          { status: 404 }
        );
      }
      targets = [line_user_id];
    } else {
      // line_followers に display_name が無いIDを抽出
      const ids = account.notify_line_user_ids ?? [];
      if (ids.length === 0) {
        return NextResponse.json({ results: [] satisfies RefreshResult[] });
      }
      const { data: followers } = await admin
        .from("line_followers")
        .select("line_user_id, display_name")
        .eq("line_account_id", account.id)
        .in("line_user_id", ids);
      const known = new Set(
        (followers ?? [])
          .filter((f) => !!(f as { display_name: string | null }).display_name)
          .map((f) => (f as { line_user_id: string }).line_user_id)
      );
      targets = ids.filter((id) => !known.has(id));
    }

    const results: RefreshResult[] = [];
    const nowIso = new Date().toISOString();

    for (const id of targets) {
      const profile = await getLineUserProfile(account.channel_access_token, id);
      if (!profile.ok) {
        results.push({ line_user_id: id, ok: false, error: profile.error });
        continue;
      }
      const { error: upsertError } = await admin
        .from("line_followers")
        .upsert(
          {
            line_account_id: account.id,
            line_user_id: id,
            display_name: profile.data.displayName,
            picture_url: profile.data.pictureUrl ?? null,
            is_following: true,
            followed_at: nowIso,
            unfollowed_at: null,
          },
          { onConflict: "line_account_id,line_user_id" }
        );
      if (upsertError) {
        results.push({
          line_user_id: id,
          ok: false,
          error: upsertError.message,
        });
        continue;
      }
      results.push({
        line_user_id: id,
        ok: true,
        display_name: profile.data.displayName,
      });
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[refresh-profile] unexpected", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
