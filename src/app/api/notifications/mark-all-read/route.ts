import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── POST /api/notifications/mark-all-read ─────────────────────
// Marks all notifications as read for the authenticated user.

export async function POST() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { error: "Supabase環境変数が設定されていません。.env.localを確認してください。" },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();

    // Get current user's email
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_email", user.email)
      .eq("is_read", false);

    if (error) {
      console.error("[POST /api/notifications/mark-all-read] Supabase error:", error);
      return NextResponse.json(
        { error: "通知の更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/notifications/mark-all-read] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
