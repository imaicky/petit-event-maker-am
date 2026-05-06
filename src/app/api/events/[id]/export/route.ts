import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canManageEvent } from "@/lib/check-event-access";

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

  console.log("[CSV Export] eventId:", eventId, "user:", user?.id ?? "none", "email:", user?.email ?? "none");

  if (!user) {
    console.log("[CSV Export] FAIL: no user");
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // Event access check (creator or co-admin)
  const hasAccess = await canManageEvent(supabase, eventId, user.id);
  console.log("[CSV Export] hasAccess:", hasAccess);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "このイベントへのアクセス権がありません" },
      { status: 403 }
    );
  }

  // Fetch event for title
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  console.log("[CSV Export] event:", event?.title ?? "null", "eventError:", eventError?.message ?? "none");

  if (!event) {
    return NextResponse.json(
      { error: "イベントが見つかりません" },
      { status: 404 }
    );
  }

  // Fetch confirmed bookings using same client as auth (RLS applies)
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("guest_name, guest_email, guest_phone, attended, created_at")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });

  console.log("[CSV Export] bookings count:", bookings?.length ?? 0, "bookingsError:", bookingsError?.message ?? "none");

  if (bookingsError) {
    console.log("[CSV Export] FAIL: bookingsError:", JSON.stringify(bookingsError));
    return NextResponse.json(
      { error: "予約データの取得に失敗しました" },
      { status: 500 }
    );
  }

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
      "Content-Disposition": `attachment; filename="export.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
