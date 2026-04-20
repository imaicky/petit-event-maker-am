import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargetUser } from "@/lib/admin";

// ─── GET /api/line/followers ────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Auth check with user-scoped client
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const targetParam = request.nextUrl.searchParams.get("target_user_id");

    let targetUserId: string;
    try {
      ({ targetUserId } = await resolveTargetUser(user.id, targetParam));
    } catch {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // Data queries with admin client (bypasses RLS)
    const admin = createAdminClient();

    // Get the target user's line_account
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("id, owner_line_user_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!lineAccount) {
      return NextResponse.json({ followers: [], owner_line_user_id: null });
    }

    // Get followers
    const { data: followers, error } = await admin
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
