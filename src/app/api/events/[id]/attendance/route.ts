import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // Event access check (creator or co-admin)
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
  const { booking_id, booking_ids, attended } = body as {
    booking_id?: string;
    booking_ids?: string[];
    attended: boolean | null;
  };

  if (attended !== true && attended !== false && attended !== null) {
    return NextResponse.json(
      { error: "attended は true / false / null のいずれかを指定してください" },
      { status: 400 }
    );
  }

  const ids = booking_ids ?? (booking_id ? [booking_id] : []);
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "booking_id または booking_ids を指定してください" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("bookings")
    .update({ attended })
    .eq("event_id", eventId)
    .in("id", ids);

  if (updateError) {
    return NextResponse.json(
      { error: "出欠の更新に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ updated: ids.length });
}
