import { NextRequest, NextResponse } from "next/server";
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

// ─── POST /api/notifications/[id]/read ───────────────────────

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await props.params;
    const supabase = await createClient();

    // Verify notification exists
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "通知が見つかりません" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("[POST /api/notifications/[id]/read] Supabase error:", error);
      return NextResponse.json(
        { error: "通知の更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/notifications/[id]/read] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
