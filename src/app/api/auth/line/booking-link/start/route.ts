import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/auth/line/booking-link/start ───────────────────
// 申込者本人のLINE紐付け開始エンドポイント。Thanks ページの
// 「LINEで通知を受け取る」ボタンから遷移する。
//
// 必須クエリ:
//   booking_id : 申込ID
//   token      : bookings.line_link_token と一致する必要がある
//
// state, booking_id, token を HttpOnly cookie に保存し、LINEの認可URLへ
// リダイレクトする。コールバック側で cookie の token と DB の token を
// 検証し、一致すれば line_user_id を保存する。

export async function GET(request: NextRequest) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json(
      { error: "LINE Login が未設定です" },
      { status: 503 }
    );
  }

  const bookingId = request.nextUrl.searchParams.get("booking_id");
  const token = request.nextUrl.searchParams.get("token");
  if (!bookingId || !token) {
    return NextResponse.json(
      { error: "booking_id and token are required" },
      { status: 400 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }
  const admin = createAdminClient();

  // booking の存在と token 一致を検証
  const { data: booking } = await admin
    .from("bookings")
    .select("id, line_link_token, event_id")
    .eq("id", bookingId)
    .maybeSingle();
  const b = booking as { id: string; line_link_token: string | null; event_id: string } | null;
  if (!b || !b.line_link_token || b.line_link_token !== token) {
    return NextResponse.json(
      { error: "リンクが無効です。確認メールのリンクからアクセスしてください。" },
      { status: 403 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${request.nextUrl.origin}/api/auth/line/booking-link/callback`;

  const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", channelId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "profile openid");
  authUrl.searchParams.set("bot_prompt", "normal");

  const response = NextResponse.redirect(authUrl.toString());
  // CSRF対策 + booking特定 + token検証用にすべて cookie に保存
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  response.cookies.set("line_booking_link_state", state, cookieOpts);
  response.cookies.set("line_booking_link_id", bookingId, cookieOpts);
  response.cookies.set("line_booking_link_token", token, cookieOpts);
  return response;
}
