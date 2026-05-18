import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/line/tags — 自分のLINE公式アカウントのフォロワーに付いているタグ一覧と、
// 各タグのフォロワー数を返す。配信ダイアログの「タグで絞る」UI 用。
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const admin = createAdminClient();

  // line_account_id を引く
  const { data: la } = await admin
    .from("line_accounts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const acc = la as { id: string } | null;
  if (!acc) return NextResponse.json({ tags: [] });

  // is_following=true なフォロワーの tags を集計
  const { data: followers } = await admin
    .from("line_followers")
    .select("tags")
    .eq("line_account_id", acc.id)
    .eq("is_following", true);

  const counts = new Map<string, number>();
  for (const f of (followers ?? []) as Array<{ tags: string[] | null }>) {
    for (const t of f.tags ?? []) {
      if (!t) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const tags = Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ tags });
}
