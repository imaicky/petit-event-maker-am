import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProUser, IS_PRO_OPEN_ACCESS } from "@/lib/pro-plan";

// GET /api/me/plan
// 現在ログイン中のユーザーが PRO プランかどうかをクライアントに返す
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ pro: false, authenticated: false });
  }
  const pro = await isProUser(supabase, user.id);
  return NextResponse.json({
    pro,
    authenticated: true,
    openAccess: IS_PRO_OPEN_ACCESS,
  });
}
