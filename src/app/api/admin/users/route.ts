import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/users ─ 管理者用：全ユーザー一覧 ──────────

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Check admin
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    // Get all users with their LINE account status
    const { data: users, error } = await admin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET /api/admin/users] Supabase error:", error);
      return NextResponse.json({ error: "ユーザー一覧の取得に失敗しました" }, { status: 500 });
    }

    // Get LINE account status for all users
    const { data: lineAccounts } = await admin
      .from("line_accounts")
      .select("user_id, channel_name, is_active");

    const lineMap = new Map(
      (lineAccounts ?? []).map((la) => [la.user_id, { channel_name: la.channel_name, is_active: la.is_active }])
    );

    const result = (users ?? []).map((u) => ({
      ...u,
      line_connected: lineMap.has(u.id),
      line_channel_name: lineMap.get(u.id)?.channel_name ?? null,
    }));

    return NextResponse.json({ users: result, isAdmin: true });
  } catch (err) {
    console.error("[GET /api/admin/users] Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
