import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserHistory } from "@/lib/user-history";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const history = await getUserHistory(user.id);
    return NextResponse.json({ history });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
