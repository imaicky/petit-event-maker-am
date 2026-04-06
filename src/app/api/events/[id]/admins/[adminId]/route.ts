import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEventCreator } from "@/lib/check-event-access";

// DELETE /api/events/[id]/admins/[adminId] — remove a co-admin
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; adminId: string }> }
) {
  try {
    const { id: eventId, adminId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Only the creator can remove admins
    const isCreator = await isEventCreator(supabase, eventId, user.id);
    if (!isCreator) {
      return NextResponse.json(
        { error: "共同管理者を削除する権限がありません" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("event_admins")
      .delete()
      .eq("id", adminId)
      .eq("event_id", eventId);

    if (error) {
      console.error("[DELETE /api/events/[id]/admins/[adminId]] Error:", error);
      return NextResponse.json(
        { error: "共同管理者の削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/events/[id]/admins/[adminId]] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
