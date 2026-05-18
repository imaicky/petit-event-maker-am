import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// /api/line/step-sequence
//   GET  — 自分のシーケンス（+ステップ一覧）を取得。無ければ作成して返す。
//   PUT  — シーケンス自体の設定更新（name / is_active）

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    // 既存シーケンスを取得 or 作成
    let { data: sequence } = await supabase
      .from("line_step_sequences")
      .select("id, name, is_active, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sequence) {
      const ins = await supabase
        .from("line_step_sequences")
        .insert({ user_id: user.id })
        .select("id, name, is_active, created_at, updated_at")
        .single();
      if (ins.error) {
        // テーブル未マイグレ環境では空で返す
        const msg = (ins.error.message || "").toLowerCase();
        if (msg.includes("does not exist") || msg.includes("relation")) {
          return NextResponse.json({
            sequence: null,
            messages: [],
            unmigrated: true,
          });
        }
        return NextResponse.json({ error: ins.error.message }, { status: 400 });
      }
      sequence = ins.data;
    }

    const seq = sequence as { id: string } & Record<string, unknown>;
    const { data: messages } = await supabase
      .from("line_step_messages")
      .select("id, offset_hours, body, sort_order, is_active, updated_at")
      .eq("sequence_id", seq.id)
      .order("offset_hours", { ascending: true });

    return NextResponse.json({ sequence, messages: messages ?? [] });
  } catch {
    return NextResponse.json({ sequence: null, messages: [] });
  }
}

export async function PUT(request: NextRequest) {
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
  const { data, error } = await supabase
    .from("line_step_sequences")
    .update(parsed.data)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ sequence: data });
}
