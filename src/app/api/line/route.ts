import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLineBotInfo } from "@/lib/line";

// ─── GET /api/line ─ 自分のLINE連携情報を取得 ─────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("line_accounts")
      .select("id, channel_name, is_active, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/line] Supabase error:", error);
      return NextResponse.json(
        { error: "LINE連携情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lineAccount: data });
  } catch (err) {
    console.error("[GET /api/line] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── POST /api/line ─ LINE連携を登録/更新 ─────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const token = body.channel_access_token;
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { error: "チャネルアクセストークンを入力してください" },
        { status: 400 }
      );
    }

    // Validate token by fetching bot info
    const botResult = await getLineBotInfo(token.trim());
    if (!botResult.ok) {
      return NextResponse.json(
        {
          error: "トークンの検証に失敗しました。正しいチャネルアクセストークンか確認してください。",
          detail: botResult.error,
        },
        { status: 400 }
      );
    }

    // Upsert line_accounts
    const { data, error } = await supabase
      .from("line_accounts")
      .upsert(
        {
          user_id: user.id,
          channel_name: botResult.data.displayName,
          channel_access_token: token.trim(),
          is_active: true,
        },
        { onConflict: "user_id" }
      )
      .select("id, channel_name, is_active, created_at, updated_at")
      .single();

    if (error) {
      console.error("[POST /api/line] Supabase error:", error);
      return NextResponse.json(
        { error: "LINE連携の保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lineAccount: data }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/line] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/line ─ LINE連携を解除 ────────────────────────

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { error } = await supabase
      .from("line_accounts")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("[DELETE /api/line] Supabase error:", error);
      return NextResponse.json(
        { error: "LINE連携の解除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/line] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
