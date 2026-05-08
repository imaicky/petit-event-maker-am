import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";

export const dynamic = "force-dynamic";

/**
 * GET /api/events/[id]/attendees
 *
 * Returns the full booking lists (confirmed / waitlisted / cancelled) for an
 * event. Bookings are protected by RLS, so anonymous and even non-creator
 * sessions cannot read them via the public client. This endpoint authorizes
 * the caller as event creator / accepted co-admin / super-admin and uses the
 * service-role client to bypass RLS for legitimate admin views.
 */
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
    return NextResponse.json(
      { error: "このイベントの閲覧権限がありません" },
      { status: 403 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "サーバー設定エラーです" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  const [confirmed, waitlisted, cancelled, eventResult] = await Promise.all([
    admin
      .from("bookings")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true }),
    admin
      .from("bookings")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true }),
    admin
      .from("bookings")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "cancelled")
      .order("created_at", { ascending: true }),
    admin.from("events").select("*").eq("id", eventId).single(),
  ]);

  if (eventResult.error) {
    return NextResponse.json(
      { error: "イベントが見つかりませんでした" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    event: eventResult.data,
    confirmed: confirmed.data ?? [],
    waitlisted: waitlisted.data ?? [],
    cancelled: cancelled.data ?? [],
  });
}
