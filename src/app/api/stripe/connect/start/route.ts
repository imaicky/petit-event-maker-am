import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildConnectAuthorizeUrl,
  isConnectConfigured,
} from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isConnectConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe Connect が未設定です。STRIPE_SECRET_KEY と STRIPE_CONNECT_CLIENT_ID を設定してください",
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // CSRF対策＋ユーザー識別: state にユーザーIDを埋める
  // 簡易実装: signed payload （HMAC）が望ましいが、ここではrandom + supabase Authのcookieに依存
  const stateRandom = crypto.randomUUID();
  const state = `${user.id}.${stateRandom}`;

  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/stripe/connect/callback`;

  const authorizeUrl = buildConnectAuthorizeUrl({
    state,
    redirectUri,
    mode: "standard",
  });

  // Set state cookie for CSRF check on callback
  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set("stripe_connect_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });
  return res;
}
