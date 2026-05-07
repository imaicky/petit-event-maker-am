import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLineBotInfo } from "@/lib/line";

// POST /api/line/validate
// Body: { channel_access_token: string }
// Returns: { ok: true, displayName, basicId, userId } on success,
//          { ok: false, error } otherwise (always 200 to keep the wizard simple)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "認証が必要です" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const token =
      typeof body?.channel_access_token === "string"
        ? body.channel_access_token.trim()
        : "";

    if (!token) {
      return NextResponse.json({
        ok: false,
        error: "アクセストークンを貼り付けてください",
      });
    }

    const botResult = await getLineBotInfo(token);
    if (!botResult.ok) {
      return NextResponse.json({
        ok: false,
        error:
          "トークンの検証に失敗しました。LINE Developers の「Messaging API設定」→「チャネルアクセストークン」を確認してもう一度貼り付けてください。",
        detail: botResult.error,
      });
    }

    return NextResponse.json({
      ok: true,
      displayName: botResult.data.displayName,
      basicId: botResult.data.basicId ?? null,
      userId: botResult.data.userId,
    });
  } catch (err) {
    console.error("[POST /api/line/validate] error:", err);
    return NextResponse.json(
      { ok: false, error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
