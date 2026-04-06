import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";

// ─── PATCH /api/events/[id]/bookings/[bookingId] ─────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const { id: eventId, bookingId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // Event access check
  const hasAccess = await canManageEvent(supabase, eventId, user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "このイベントへのアクセス権がありません" },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエストの形式が不正です" },
      { status: 400 }
    );
  }

  const { guest_name, guest_email, guest_phone, status } = body as {
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
    status?: string;
  };

  // Validate at least one field
  if (!guest_name && !guest_email && guest_phone === undefined && !status) {
    return NextResponse.json(
      { error: "更新するフィールドを指定してください" },
      { status: 400 }
    );
  }

  // Verify booking belongs to this event
  const admin = createAdminClient();
  const { data: booking, error: fetchError } = await admin
    .from("bookings")
    .select("id, event_id, guest_email")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json(
      { error: "予約が見つかりません" },
      { status: 404 }
    );
  }

  if (booking.event_id !== eventId) {
    return NextResponse.json(
      { error: "予約がこのイベントに属していません" },
      { status: 400 }
    );
  }

  // Check email uniqueness if changing email
  if (guest_email && guest_email !== booking.guest_email) {
    const { data: dup } = await admin
      .from("bookings")
      .select("id")
      .eq("event_id", eventId)
      .eq("guest_email", guest_email)
      .eq("status", "confirmed")
      .neq("id", bookingId)
      .maybeSingle();

    if (dup) {
      return NextResponse.json(
        { error: "このメールアドレスで既に予約があります" },
        { status: 409 }
      );
    }
  }

  // Build update payload
  const updates: Record<string, unknown> = {};
  if (guest_name) updates.guest_name = guest_name;
  if (guest_email) updates.guest_email = guest_email;
  if (guest_phone !== undefined) updates.guest_phone = guest_phone || null;
  if (status && ["confirmed", "cancelled"].includes(status)) {
    updates.status = status;
  }

  const { error: updateError } = await admin
    .from("bookings")
    .update(updates)
    .eq("id", bookingId);

  if (updateError) {
    console.error("[PATCH booking] Update error:", updateError);
    return NextResponse.json(
      { error: "予約の更新に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, bookingId });
}
