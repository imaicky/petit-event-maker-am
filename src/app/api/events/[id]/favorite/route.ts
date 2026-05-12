import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addFavorite, removeFavorite } from "@/lib/favorites";
import { recordInterestFromFavorite } from "@/lib/user-interest";

async function getAuthedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const result = await addFavorite(userId, eventId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 興味スコアに +3 加点（失敗してもUI操作自体は壊さない）
  recordInterestFromFavorite(userId, eventId).catch((e) => {
    console.warn(
      "[favorite] recordInterestFromFavorite failed:",
      e instanceof Error ? e.message : String(e)
    );
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const result = await removeFavorite(userId, eventId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  // 解除時はスコアを減らさない（過去の興味履歴は残す方針）
  return NextResponse.json({ ok: true });
}
