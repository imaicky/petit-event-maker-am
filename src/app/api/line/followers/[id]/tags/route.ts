import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PUT /api/line/followers/[id]/tags — Update follower tags
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: followerId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json();
    const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [];

    // Verify the follower belongs to this user's LINE account
    const { data: lineAccount } = await supabase
      .from("line_accounts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!lineAccount) {
      return NextResponse.json({ error: "LINE連携が設定されていません" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: follower, error } = await admin
      .from("line_followers")
      .update({ tags })
      .eq("id", followerId)
      .eq("line_account_id", lineAccount.id)
      .select("id, tags")
      .single();

    if (error || !follower) {
      return NextResponse.json({ error: "フォロワーが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ follower });
  } catch (err) {
    console.error("[PUT /api/line/followers/[id]/tags] Error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
