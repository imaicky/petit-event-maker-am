import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// POST /api/events/[id]/dismiss — フィードのおすすめから除外
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const admin = createAdminClient();
  const { error } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )("user_event_dismissals").insert({
    user_id: userId,
    event_id: eventId,
  });
  // 23505 = unique_violation → 冪等として成功扱い
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/events/[id]/dismiss — 除外を解除（戻す）
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }
  const admin = createAdminClient();
  const { error } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )("user_event_dismissals")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
