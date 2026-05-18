import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// /api/line/templates  — メッセージテンプレート CRUD（一覧/作成）

const createSchema = z.object({
  name: z.string().min(1, "テンプレ名を入力してください").max(50),
  body: z.string().min(1, "本文を入力してください").max(500),
});

// GET — 自分のテンプレ一覧（use_count desc）
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  try {
    const { data, error } = await supabase
      .from("line_message_templates")
      .select("id, name, body, sort_order, use_count, updated_at")
      .eq("user_id", user.id)
      .order("use_count", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const missing =
        error.code === "42P01" ||
        msg.includes("does not exist") ||
        msg.includes("relation");
      if (missing) {
        return NextResponse.json({ templates: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ templates: data ?? [] });
  } catch {
    return NextResponse.json({ templates: [] });
  }
}

// POST — 新規作成
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const first = fieldErrors.name?.[0] ?? fieldErrors.body?.[0] ?? "入力エラー";
    return NextResponse.json({ error: first }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("line_message_templates")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      body: parsed.data.body,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ template: data });
}
