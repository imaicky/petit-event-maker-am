import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { suggestSyllabus } from "@/lib/syllabus-suggest";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const allowed = await canManageEvent(supabase, eventId, user.id);
  if (!allowed) {
    return NextResponse.json({ error: "閲覧権限なし" }, { status: 403 });
  }

  // 主催者IDの解決（共同管理者のときも creator_id ベースで提案を出す）
  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("creator_id")
    .eq("id", eventId)
    .single();
  const organizerId =
    (ev as { creator_id: string | null } | null)?.creator_id ?? user.id;

  try {
    const suggestions = await suggestSyllabus(eventId, organizerId);
    return NextResponse.json({ suggestions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
