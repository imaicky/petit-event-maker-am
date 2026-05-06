import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPER_ADMIN_EMAILS = ["imatoru@gmail.com"];

// POST /api/booking-counts
// Body: { event_ids: string[] }
// Returns: { counts: Record<string, number> }
//
// Bookings RLS hides rows from anyone other than the booker / event creator,
// which makes the dashboard show 0 participants for co-admins and super-admins.
// This endpoint resolves confirmed counts via the service role, but only for
// events the caller is actually allowed to manage (creator / accepted co-admin
// / super-admin).
export async function POST(request: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラーです" }, { status: 500 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body?.event_ids)
      ? (body.event_ids as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email ?? "");
    const admin = createAdminClient();

    // Determine which event_ids the user is authorized for
    let allowedIds: string[] = [];
    if (isSuperAdmin) {
      allowedIds = ids;
    } else {
      const { data: ownEvents } = await admin
        .from("events")
        .select("id")
        .in("id", ids)
        .eq("creator_id", user.id);
      const ownIds = (ownEvents ?? []).map((r) => (r as { id: string }).id);

      const remaining = ids.filter((id) => !ownIds.includes(id));
      let coAdminIds: string[] = [];
      if (remaining.length > 0) {
        const { data: adminRows } = await admin
          .from("event_admins")
          .select("event_id")
          .in("event_id", remaining)
          .eq("user_id", user.id)
          .eq("status", "accepted");
        coAdminIds = (adminRows ?? []).map((r) => (r as { event_id: string }).event_id);
      }
      allowedIds = [...ownIds, ...coAdminIds];
    }

    if (allowedIds.length === 0) {
      return NextResponse.json({ counts: {} });
    }

    const { data: confirmedRows } = await admin
      .from("bookings")
      .select("event_id")
      .in("event_id", allowedIds)
      .eq("status", "confirmed");

    const counts: Record<string, number> = {};
    for (const row of confirmedRows ?? []) {
      const eid = (row as { event_id: string }).event_id;
      counts[eid] = (counts[eid] ?? 0) + 1;
    }

    return NextResponse.json({ counts });
  } catch (err) {
    console.error("[POST /api/booking-counts] Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
