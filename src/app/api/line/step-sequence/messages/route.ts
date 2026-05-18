import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// POST /api/line/step-sequence/messages — ステップ追加

const createSchema = z.object({
  offset_hours: z.number().int().min(0).max(24 * 365),
  body: z.string().min(1, "本文を入力してください").max(500),
});

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
    return NextResponse.json({ error: "入力エラー" }, { status: 400 });
  }

  // 自分のシーケンスを取得 or 作成
  let { data: sequence } = await supabase
    .from("line_step_sequences")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sequence) {
    const ins = await supabase
      .from("line_step_sequences")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 400 });
    }
    sequence = ins.data;
  }

  const { data, error } = await supabase
    .from("line_step_messages")
    .insert({
      sequence_id: (sequence as { id: string }).id,
      offset_hours: parsed.data.offset_hours,
      body: parsed.data.body,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ message: data });
}
