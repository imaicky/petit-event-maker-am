import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargetUser } from "@/lib/admin";
import { pushLineMessage } from "@/lib/line";

// ─── GET /api/auth/line/callback ─────────────────────────────
// LINE Login の認可コードを access_token に交換し、
// /v2/profile から userId を取得して notify_line_user_ids に追加する。

function backTo(origin: string, searchParams: Record<string, string>) {
  const url = new URL("/settings/line", origin);
  for (const [k, v] of Object.entries(searchParams)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "LINE Login が未設定です" })
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/", origin));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const errorParam = request.nextUrl.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: errorParam })
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "invalid_request" })
    );
  }

  // state検証
  const cookieState = request.cookies.get("line_login_state")?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "state_mismatch" })
    );
  }

  const targetParam = request.cookies.get("line_login_target")?.value || null;

  // 認可コード → access_token
  const redirectUri = `${origin}/api/auth/line/callback`;
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }).toString(),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => "");
    console.error("[line login] token exchange failed:", tokenRes.status, text);
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "token_exchange_failed" })
    );
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "no_access_token" })
    );
  }

  // /v2/profile で userId 取得
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "profile_fetch_failed" })
    );
  }
  const profile = (await profileRes.json()) as {
    userId?: string;
    displayName?: string;
    pictureUrl?: string;
  };
  if (!profile.userId) {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "no_user_id" })
    );
  }

  // target_user_id を解決（管理者代理対応）
  let targetUserId: string;
  try {
    ({ targetUserId } = await resolveTargetUser(user.id, targetParam));
  } catch {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "forbidden" })
    );
  }

  const admin = createAdminClient();
  const { data: la } = await admin
    .from("line_accounts")
    .select("id, channel_access_token, owner_line_user_id, notify_line_user_ids")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!la) {
    return NextResponse.redirect(
      backTo(origin, { line_link_error: "no_line_account" })
    );
  }
  const account = la as {
    id: string;
    channel_access_token: string | null;
    owner_line_user_id: string | null;
    notify_line_user_ids: string[] | null;
  };

  const current = account.notify_line_user_ids ?? [];
  const already = current.includes(profile.userId);
  const nextIds = already ? current : [...current, profile.userId];

  // 友だち追加されている前提でテスト push を投げる（pre-flight）。
  // 失敗しても登録は通すが、ユーザーに「公式アカウント友だち追加を案内」する。
  let pushOk = true;
  let pushError: string | undefined;
  if (account.channel_access_token) {
    const r = await pushLineMessage(
      account.channel_access_token,
      profile.userId,
      `✅ 通知先として登録されました\n\nこのLINEに新規予約や決済完了の通知が届きます。\n停止するには設定画面で削除するか「通知OFF」と送信してください。`
    );
    if (!r.ok) {
      pushOk = false;
      pushError = r.error;
    }
  }

  // 登録（owner_line_user_id が空ならついでに）
  const updates: Record<string, unknown> = { notify_line_user_ids: nextIds };
  if (!account.owner_line_user_id) {
    updates.owner_line_user_id = profile.userId;
  }
  await admin.from("line_accounts").update(updates).eq("id", account.id);

  // line_followers にプロフィールを保存（通知先表示の「プロフィール未取得」を防ぐ）
  // LINE Login で本人確認が完了している以上、フォロワー一覧にも表示するため
  // is_following=true で記録する。実際の友だち追加状態とは別の意味合いになるが、
  // 「通知先として登録した本人」が画面上に出ない方が UX 上の問題が大きいため。
  try {
    const nowIso = new Date().toISOString();
    await admin
      .from("line_followers")
      .upsert(
        {
          line_account_id: account.id,
          line_user_id: profile.userId,
          display_name: profile.displayName ?? null,
          picture_url: profile.pictureUrl ?? null,
          is_following: true,
          followed_at: nowIso,
          unfollowed_at: null,
        },
        { onConflict: "line_account_id,line_user_id" }
      );
  } catch (err) {
    console.error("[line login] follower upsert failed:", err);
    // 通知先登録自体は成功させるため、ここでは redirect しない
  }

  // クッキー削除
  const successParams: Record<string, string> = {
    line_link_ok: already ? "already" : "added",
  };
  if (!pushOk) {
    successParams.line_link_push_warn = pushError ?? "1";
  }
  if (profile.displayName) {
    successParams.line_link_name = profile.displayName;
  }
  if (targetParam) {
    successParams.target_user_id = targetParam;
  }
  const response = NextResponse.redirect(backTo(origin, successParams));
  response.cookies.delete("line_login_state");
  response.cookies.delete("line_login_target");
  return response;
}
