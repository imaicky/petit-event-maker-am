import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/line/followers ────────────────────────────────

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Get the user's line_account
    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("id, owner_line_user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount) {
      return NextResponse.json({ followers: [], owner_line_user_id: null });
    }

    // Get followers
    const { data: followers, error } = await supabase
      .from("line_followers")
      .select("id, line_user_id, display_name, picture_url, is_following, followed_at")
      .eq("line_account_id", lineAccount.id)
      .eq("is_following", true)
      .order("followed_at", { ascending: false });

    if (error) {
      console.error("[GET /api/line/followers] Supabase error:", error);
      return NextResponse.json(
        { error: "フォロワー一覧の取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      followers: followers ?? [],
      owner_line_user_id: lineAccount.owner_line_user_id,
    });
  } catch (err) {
    console.error("[GET /api/line/followers] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
