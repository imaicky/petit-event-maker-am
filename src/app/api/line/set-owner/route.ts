import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── POST /api/line/set-owner ───────────────────────────────
// Sets the owner_line_user_id on line_accounts so booking
// notifications go as a 1:1 push DM instead of broadcast.

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
    const lineUserId = body.line_user_id;
    if (!lineUserId || typeof lineUserId !== "string") {
      return NextResponse.json(
        { error: "LINE User IDを指定してください" },
        { status: 400 }
      );
    }

    // Verify the line_user_id exists as a follower of this user's account
    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount) {
      return NextResponse.json(
        { error: "LINE連携が設定されていません" },
        { status: 404 }
      );
    }

    const { data: follower } = await supabase
      .from("line_followers")
      .select("id")
      .eq("line_account_id", lineAccount.id)
      .eq("line_user_id", lineUserId)
      .eq("is_following", true)
      .maybeSingle();

    if (!follower) {
      return NextResponse.json(
        { error: "指定されたユーザーはフォロワーに見つかりません" },
        { status: 404 }
      );
    }

    // Update owner_line_user_id
    const { error: updateError } = await supabase
      .from("line_accounts")
      .update({ owner_line_user_id: lineUserId })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[POST /api/line/set-owner] Supabase error:", updateError);
      return NextResponse.json(
        { error: "通知先の設定に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, owner_line_user_id: lineUserId });
  } catch (err) {
    console.error("[POST /api/line/set-owner] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
