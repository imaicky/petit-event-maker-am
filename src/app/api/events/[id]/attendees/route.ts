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

  // ─── リピート参加カウント ────────────────────────────────
  // 同じ主催者の confirmed 予約をメールでカウントし、
  // 各 booking に repeat_count (このイベント含む累計参加回数) を付与する。
  const creatorId = (eventResult.data as { creator_id: string | null }).creator_id;
  const repeatCounts = new Map<string, number>();
  if (creatorId) {
    const { data: creatorEvents } = await admin
      .from("events")
      .select("id")
      .eq("creator_id", creatorId);
    const creatorEventIds = ((creatorEvents ?? []) as Array<{ id: string }>).map(
      (e) => e.id
    );
    if (creatorEventIds.length > 0) {
      const { data: pastBookings } = await admin
        .from("bookings")
        .select("guest_email")
        .in("event_id", creatorEventIds)
        .eq("status", "confirmed");
      for (const b of (pastBookings ?? []) as Array<{ guest_email: string | null }>) {
        if (!b.guest_email) continue;
        const key = b.guest_email.toLowerCase();
        repeatCounts.set(key, (repeatCounts.get(key) ?? 0) + 1);
      }
    }
  }

  type Booking = { guest_email: string | null; [k: string]: unknown };
  const annotate = (rows: Booking[]) =>
    rows.map((b) => ({
      ...b,
      repeat_count: b.guest_email
        ? repeatCounts.get(b.guest_email.toLowerCase()) ?? 1
        : 1,
    }));

  return NextResponse.json({
    event: eventResult.data,
    confirmed: annotate((confirmed.data ?? []) as Booking[]),
    waitlisted: annotate((waitlisted.data ?? []) as Booking[]),
    cancelled: annotate((cancelled.data ?? []) as Booking[]),
  });
}
