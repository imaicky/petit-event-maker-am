import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await props.params;

    const body = await request.json();
    const passcode = typeof body.passcode === "string" ? body.passcode : "";

    if (!passcode) {
      return NextResponse.json(
        { error: "合言葉を入力してください" },
        { status: 400 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "サーバー設定エラーです" },
        { status: 500 }
      );
    }

    const admin = createAdminClient();
    const { data: event, error } = await admin
      .from("events")
      .select("is_limited, limited_passcode")
      .eq("id", eventId)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    if (!event.is_limited || !event.limited_passcode) {
      return NextResponse.json(
        { error: "このイベントは限定公開ではありません" },
        { status: 400 }
      );
    }

    if (passcode !== event.limited_passcode) {
      return NextResponse.json(
        { error: "合言葉が正しくありません" },
        { status: 403 }
      );
    }

    // Set httpOnly cookie for 24 hours
    const res = NextResponse.json({ ok: true });
    res.cookies.set(`event-pass-${eventId}`, passcode, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[POST /api/events/[id]/verify-passcode] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
