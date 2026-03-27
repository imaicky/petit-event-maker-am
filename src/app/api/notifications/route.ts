import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Helpers ─────────────────────────────────────────────────

function checkEnvVars(): NextResponse | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { error: "Supabase環境変数が設定されていません。.env.localを確認してください。" },
      { status: 503 }
    );
  }
  return null;
}

// ─── GET /api/notifications ────────────────────────────────────
// Returns notifications for the authenticated user (via RLS).

export async function GET() {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const supabase = await createClient();

    // RLS policy on notifications table filters by auth.uid() email automatically
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/notifications] Supabase error:", error);
      return NextResponse.json(
        { error: "通知の取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications: notifications ?? [] });
  } catch (err) {
    console.error("[GET /api/notifications] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
