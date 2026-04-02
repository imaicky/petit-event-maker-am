import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
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

  // Event ownership check
  const { data: event } = await supabase
    .from("events")
    .select("id, title, creator_id")
    .eq("id", eventId)
    .single();

  if (!event || event.creator_id !== user.id) {
    return NextResponse.json(
      { error: "このイベントへのアクセス権がありません" },
      { status: 403 }
    );
  }

  // Fetch confirmed bookings
  const admin = createAdminClient();
  const { data: bookings } = await admin
    .from("bookings")
    .select("guest_name, guest_email, guest_phone, attended, created_at")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });

  const rows = bookings ?? [];

  // Build CSV
  const header = ["番号", "お名前", "メールアドレス", "電話番号", "出欠", "申込日時"];
  const csvRows = rows.map((b, i) => [
    String(i + 1),
    b.guest_name,
    b.guest_email,
    b.guest_phone ?? "",
    b.attended === true ? "出席" : b.attended === false ? "欠席" : "未記録",
    new Date(b.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
  ]);

  const csvContent = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  // UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF";
  const body = bom + csvContent;

  const safeTitle = event.title.replace(/[^a-zA-Z0-9\u3000-\u9FFF]/g, "_").slice(0, 30);
  const filename = `${safeTitle}_参加者一覧.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
