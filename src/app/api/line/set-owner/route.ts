import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTargetUser } from "@/lib/admin";

// ─── POST /api/line/set-owner ───────────────────────────────
// Sets the owner_line_user_id on line_accounts so booking
// notifications go as a 1:1 push DM instead of broadcast.

export async function POST(request: NextRequest) {
  try {
    // Auth check with user-scoped client
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const lineUserId = body.line_user_id;
    const targetParam = body.target_user_id || null;

    if (!lineUserId || typeof lineUserId !== "string") {
      return NextResponse.json(
        { error: "LINE User IDを指定してください" },
        { status: 400 }
      );
    }

    let targetUserId: string;
    try {
      ({ targetUserId } = await resolveTargetUser(user.id, targetParam));
    } catch {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // Data queries with admin client (bypasses RLS)
    const admin = createAdminClient();

    // Verify the line_user_id exists as a follower of the target user's account
    const { data: lineAccount } = await admin
      .from("line_accounts")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!lineAccount) {
      return NextResponse.json(
        { error: "LINE連携が設定されていません" },
        { status: 404 }
      );
    }

    const { data: follower } = await admin
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
    const { error: updateError } = await admin
      .from("line_accounts")
      .update({ owner_line_user_id: lineUserId })
      .eq("user_id", targetUserId);

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
