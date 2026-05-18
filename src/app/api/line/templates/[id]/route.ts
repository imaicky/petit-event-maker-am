import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// /api/line/templates/[id]
//   PUT — 編集 / 使用回数加算
//   DELETE — 削除

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  body: z.string().min(1).max(500).optional(),
  // 使用時にインクリメント
  increment_use_count: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力エラー" }, { status: 400 });
  }

  if (parsed.data.increment_use_count) {
    // use_count を +1。RPC を作る代わりに read-modify-write で行う（個人テンプレなので競合は少ない）
    const { data: cur } = await supabase
      .from("line_message_templates")
      .select("use_count")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    const next = ((cur as { use_count?: number } | null)?.use_count ?? 0) + 1;
    const { data, error } = await supabase
      .from("line_message_templates")
      .update({ use_count: next })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ template: data });
  }

  const updates: { name?: string; body?: string } = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.body !== undefined) updates.body = parsed.data.body;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "更新内容がありません" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("line_message_templates")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ template: data });
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const { error } = await supabase
    .from("line_message_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
