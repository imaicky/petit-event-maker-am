import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { isClaudeAvailable } from "@/lib/claude";
import { suggestSyllabusWithAi } from "@/lib/syllabus-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  if (!isClaudeAvailable()) {
    return NextResponse.json(
      {
        error:
          "AI生成は現在利用できません（ANTHROPIC_API_KEY が未設定）。ヒューリスティック提案を利用してください",
      },
      { status: 503 }
    );
  }

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

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("creator_id")
    .eq("id", eventId)
    .single();
  const organizerId =
    (ev as { creator_id: string | null } | null)?.creator_id ?? user.id;

  try {
    const suggestions = await suggestSyllabusWithAi(eventId, organizerId);
    return NextResponse.json({ suggestions, mode: "ai" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[syllabus-ai] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
