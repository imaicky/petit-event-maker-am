import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomField } from "@/types/database";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: menuId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // Menu ownership check
  const { data: menu } = await supabase
    .from("menus")
    .select("id, title, creator_id, custom_fields")
    .eq("id", menuId)
    .single();

  if (!menu || menu.creator_id !== user.id) {
    return NextResponse.json(
      { error: "このメニューへのアクセス権がありません" },
      { status: 403 }
    );
  }

  // Fetch confirmed bookings
  const admin = createAdminClient();
  const { data: bookings } = await admin
    .from("menu_bookings")
    .select("guest_name, guest_email, guest_phone, custom_field_values, attended, created_at")
    .eq("menu_id", menuId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });

  const rows = bookings ?? [];
  const customFields = (menu.custom_fields ?? []) as unknown as CustomField[];

  // Build CSV header
  const header = [
    "番号",
    "お名前",
    "メールアドレス",
    "電話番号",
    "出欠",
    "申込日時",
    ...customFields.map((f) => f.label),
  ];

  const csvRows = rows.map((b, i) => {
    const cfValues = (b.custom_field_values ?? {}) as Record<string, string>;
    return [
      String(i + 1),
      b.guest_name,
      b.guest_email,
      b.guest_phone ?? "",
      b.attended === true ? "出席" : b.attended === false ? "欠席" : "未記録",
      new Date(b.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }),
      ...customFields.map((f) => cfValues[f.id] ?? ""),
    ];
  });

  const csvContent = [header, ...csvRows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  // UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF";
  const body = bom + csvContent;

  const safeTitle = menu.title.replace(/[^a-zA-Z0-9\u3000-\u9FFF]/g, "_").slice(0, 30);
  const filename = `${safeTitle}_申込一覧.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
