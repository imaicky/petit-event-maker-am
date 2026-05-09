import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeOAuthCode,
  getAccountStatus,
  isConnectConfigured,
} from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

const SETTINGS_PATH = "/settings/stripe";

function redirectWithStatus(
  baseUrl: string,
  status: "ok" | "denied" | "error",
  message?: string
) {
  const url = new URL(`${baseUrl}${SETTINGS_PATH}`);
  url.searchParams.set("connect", status);
  if (message) url.searchParams.set("msg", message);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const baseUrl = `${url.protocol}//${url.host}`;

  if (!isConnectConfigured()) {
    return redirectWithStatus(baseUrl, "error", "connect_not_configured");
  }

  // ユーザーが拒否した場合
  if (error) {
    return redirectWithStatus(baseUrl, "denied", error);
  }

  if (!code || !state) {
    return redirectWithStatus(baseUrl, "error", "missing_code_or_state");
  }

  // Validate state cookie (CSRF)
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("stripe_connect_state")?.value;
  if (!stateCookie || stateCookie !== state) {
    return redirectWithStatus(baseUrl, "error", "invalid_state");
  }

  // ユーザー識別
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectWithStatus(baseUrl, "error", "not_authenticated");
  }
  const [stateUserId] = state.split(".");
  if (stateUserId !== user.id) {
    return redirectWithStatus(baseUrl, "error", "user_mismatch");
  }

  // OAuth code を access_token + acct_id に交換
  let exchanged;
  try {
    exchanged = await exchangeOAuthCode(code);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "exchange_failed";
    return redirectWithStatus(baseUrl, "error", msg);
  }

  // 接続アカウントの状態取得
  let accountStatus;
  try {
    accountStatus = await getAccountStatus(exchanged.stripe_user_id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "status_failed";
    return redirectWithStatus(baseUrl, "error", msg);
  }

  // DB に保存（Connect 方式）
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return redirectWithStatus(baseUrl, "error", "server_misconfigured");
  }
  const admin = createAdminClient();

  const { error: dbErr } = await admin.from("stripe_settings").upsert(
    {
      user_id: user.id,
      connect_mode: "standard",
      stripe_account_id: exchanged.stripe_user_id,
      stripe_secret_key: null, // legacy フィールドはクリア
      charges_enabled: accountStatus.charges_enabled,
      payouts_enabled: accountStatus.payouts_enabled,
      details_submitted: accountStatus.details_submitted,
      display_name: accountStatus.display_name ?? "",
      is_test_mode: !exchanged.livemode,
      is_active: true,
    },
    { onConflict: "user_id" }
  );

  if (dbErr) {
    console.error("[stripe/connect/callback] DB error:", dbErr);
    return redirectWithStatus(baseUrl, "error", "db_save_failed");
  }

  // Cookie 削除
  const res = redirectWithStatus(baseUrl, "ok");
  res.cookies.delete("stripe_connect_state");
  return res;
}
