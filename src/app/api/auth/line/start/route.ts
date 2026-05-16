import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/auth/line/start ────────────────────────────────
// LINE Login OAuth フロー開始。
// state を発行して HttpOnly cookie に保存し、LINEの認可URLへリダイレクト。
//
// クエリパラメータ:
//   target_user_id (optional): 管理者が他人のアカウントの通知先として登録するときに指定
//
// ※ シンプル化のため、本人確認後は target_user_id（or 自分）の
//    notify_line_user_ids に新しいLINE User IDを追加する。

export async function GET(request: NextRequest) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json(
      {
        error:
          "LINE Login が未設定です。LINE Developers Console で LINEログイン チャネルを作成し、環境変数 LINE_LOGIN_CHANNEL_ID と LINE_LOGIN_CHANNEL_SECRET をVercelに設定してください。",
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  const targetUserId = request.nextUrl.searchParams.get("target_user_id") ?? "";
  const state = randomBytes(16).toString("hex");

  // redirect_uri は本番デプロイ先のorigin
  const redirectUri = `${request.nextUrl.origin}/api/auth/line/callback`;

  const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", channelId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  // scope に profile を含めて userId を取得
  authUrl.searchParams.set("scope", "profile openid");
  // 強制的に同意画面を表示（誤クリック防止）
  authUrl.searchParams.set("bot_prompt", "normal");

  const response = NextResponse.redirect(authUrl.toString());
  // state を HttpOnly cookie に保存（CSRF対策）
  response.cookies.set("line_login_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10分
  });
  // target_user_id も保持（管理者代理用）
  if (targetUserId) {
    response.cookies.set("line_login_target", targetUserId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
  }
  return response;
}
