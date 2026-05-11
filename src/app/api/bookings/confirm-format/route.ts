import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySurveyToken } from "@/lib/format-survey-token";

// ─── GET /api/bookings/confirm-format?t=<token> ──────────────────
// 主催者からのアンケートメールのボタン押下先。
// トークン検証 → DB 更新 → 確認ページへ 302 リダイレクト。
// 公開エンドポイント（認証不要、トークンが認可の役目を果たす）。
//
// 結果は確認ページに ?status=ok|expired|invalid|error&format=physical|online を渡す。

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://petit-event-maker-am.vercel.app"
  );
}

function redirectTo(status: string, format?: string): NextResponse {
  const url = new URL("/booking/format-confirmed", baseUrl());
  url.searchParams.set("status", status);
  if (format) url.searchParams.set("format", format);
  return NextResponse.redirect(url, { status: 302 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");

  if (!token) {
    return redirectTo("invalid");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return redirectTo("error");
  }

  const payload = verifySurveyToken(token);
  if (!payload) {
    return redirectTo("expired");
  }

  try {
    const admin = createAdminClient();
    // 予約が存在し confirmed/waitlisted であることを確認
    const { data: booking, error: fetchErr } = await admin
      .from("bookings")
      .select("id, status, attendance_format, event_id")
      .eq("id", payload.bookingId)
      .maybeSingle();
    if (fetchErr || !booking) {
      return redirectTo("invalid");
    }
    if (booking.status === "cancelled") {
      return redirectTo("cancelled", payload.format);
    }

    if (booking.attendance_format === payload.format) {
      // すでに同じ形式 → 冪等で success 扱い
      return redirectTo("ok", payload.format);
    }

    const { error: updErr } = await admin
      .from("bookings")
      .update({ attendance_format: payload.format })
      .eq("id", payload.bookingId);
    if (updErr) {
      return redirectTo("error", payload.format);
    }

    return redirectTo("ok", payload.format);
  } catch {
    return redirectTo("error");
  }
}
