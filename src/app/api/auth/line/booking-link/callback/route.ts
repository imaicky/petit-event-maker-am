import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushLineMessage } from "@/lib/line";

// ─── GET /api/auth/line/booking-link/callback ───────────────
// LINE Login の OAuth コールバック。Phase A 申込者LINE紐付け用。
// cookie の booking_id / token を DB と照合し、一致したら
// /v2/profile で取得した userId を bookings.line_user_id に保存する。
// 主催者の Messaging API channel から「✅ LINE通知を有効にしました」を
// push して動作確認も行う。

function backToThanks(
  origin: string,
  eventId: string,
  bookingId: string,
  query: Record<string, string> = {}
) {
  const url = new URL(`/events/${eventId}/thanks`, origin);
  url.searchParams.set("booking_id", bookingId);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    return NextResponse.json({ error: "LINE Login が未設定です" }, { status: 503 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const errorParam = request.nextUrl.searchParams.get("error");

  const cookieState = request.cookies.get("line_booking_link_state")?.value;
  const cookieBookingId = request.cookies.get("line_booking_link_id")?.value;
  const cookieToken = request.cookies.get("line_booking_link_token")?.value;

  // クッキー削除のヘルパー
  const clearCookies = (res: NextResponse) => {
    res.cookies.delete("line_booking_link_state");
    res.cookies.delete("line_booking_link_id");
    res.cookies.delete("line_booking_link_token");
    return res;
  };

  // booking_id がないとリダイレクト先も決まらないので、無ければトップに戻す
  if (!cookieBookingId) {
    return clearCookies(NextResponse.redirect(new URL("/", origin)));
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, event_id, line_link_token, line_user_id, guest_name")
    .eq("id", cookieBookingId)
    .maybeSingle();
  const b = booking as {
    id: string;
    event_id: string;
    line_link_token: string | null;
    line_user_id: string | null;
    guest_name: string;
  } | null;
  if (!b) {
    return clearCookies(NextResponse.redirect(new URL("/", origin)));
  }

  // エラー or 拒否
  if (errorParam) {
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, { line_link_error: errorParam })
      )
    );
  }
  if (!code || !state) {
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, { line_link_error: "invalid_request" })
      )
    );
  }
  if (!cookieState || cookieState !== state) {
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, { line_link_error: "state_mismatch" })
      )
    );
  }
  if (!cookieToken || cookieToken !== b.line_link_token) {
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, { line_link_error: "token_mismatch" })
      )
    );
  }

  // 認可コード → access_token
  const redirectUri = `${origin}/api/auth/line/booking-link/callback`;
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
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, {
          line_link_error: "token_exchange_failed",
        })
      )
    );
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, { line_link_error: "no_access_token" })
      )
    );
  }

  // /v2/profile で userId 取得
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!profileRes.ok) {
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, {
          line_link_error: "profile_fetch_failed",
        })
      )
    );
  }
  const profile = (await profileRes.json()) as {
    userId?: string;
    displayName?: string;
  };
  if (!profile.userId) {
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, { line_link_error: "no_user_id" })
      )
    );
  }

  // bookings に保存（token は使い切るので null に戻す）
  const { error: updErr } = await admin
    .from("bookings")
    .update({
      line_user_id: profile.userId,
      line_linked_at: new Date().toISOString(),
      line_link_token: null,
    })
    .eq("id", b.id);
  if (updErr) {
    console.error("[booking-link/callback] update error:", updErr);
    return clearCookies(
      NextResponse.redirect(
        backToThanks(origin, b.event_id, b.id, { line_link_error: "save_failed" })
      )
    );
  }

  // 主催者の channel_access_token を取得し、確認メッセージを push
  try {
    const { data: event } = await admin
      .from("events")
      .select("creator_id, title")
      .eq("id", b.event_id)
      .maybeSingle();
    const ev = event as { creator_id: string | null; title: string } | null;
    if (ev?.creator_id) {
      const { data: la } = await admin
        .from("line_accounts")
        .select("channel_access_token")
        .eq("user_id", ev.creator_id)
        .maybeSingle();
      const acc = la as { channel_access_token: string | null } | null;
      if (acc?.channel_access_token) {
        await pushLineMessage(
          acc.channel_access_token,
          profile.userId,
          `✅ LINE通知を有効にしました\n\n「${ev.title}」のリマインダーやお知らせがこちらに届きます。`
        );
      }
    }
  } catch (err) {
    console.error("[booking-link/callback] confirm push failed:", err);
    // 紐付け自体は成功させる
  }

  const response = NextResponse.redirect(
    backToThanks(origin, b.event_id, b.id, {
      line_link_ok: "1",
      ...(profile.displayName
        ? { line_link_name: profile.displayName }
        : {}),
    })
  );
  return clearCookies(response);
}
