import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageEvent } from "@/lib/check-event-access";
import { getEventInsights } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
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
    return NextResponse.json(
      { error: "閲覧権限がありません" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "30");
  const safeDays = Number.isFinite(days) && days > 0 && days <= 365 ? days : 30;

  try {
    const insights = await getEventInsights(eventId, { daysBack: safeDays });
    return NextResponse.json({ insights, range_days: safeDays });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
