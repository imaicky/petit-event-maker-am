import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

// ─── GET /api/notifications/unsubscribe?t=<token> ──────────────────
// 配信メール内のワンクリック購読停止リンク。
// トークン検証 → follows.notify_email or notify_line を false に → 確認ページへ302。
// 公開エンドポイント（認証不要）。

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://petit-event-maker-am.vercel.app"
  );
}

function redirectTo(status: string, channel?: string): NextResponse {
  const url = new URL("/unsubscribed", baseUrl());
  url.searchParams.set("status", status);
  if (channel) url.searchParams.set("channel", channel);
  return NextResponse.redirect(url, { status: 302 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");

  if (!token) return redirectTo("invalid");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return redirectTo("error");

  const payload = verifyUnsubscribeToken(token);
  if (!payload) return redirectTo("expired");

  try {
    const admin = createAdminClient();
    const column =
      payload.channel === "email" ? "notify_email" : "notify_line";
    const { error } = await (
      admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
    )("follows")
      .update({ [column]: false })
      .eq("follower_id", payload.followerId)
      .eq("organizer_id", payload.organizerId);
    if (error) return redirectTo("error", payload.channel);
    return redirectTo("ok", payload.channel);
  } catch {
    return redirectTo("error", payload.channel);
  }
}
