import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { isProUser } from "@/lib/pro-plan";

// ─── /api/events/[id]/tiers ─────────────────────────────────
// チケット種別の一覧取得 / 作成。1イベントに対する複数プラン。
// 作成は PRO 機能（isProUser チェック）。

const tierSchema = z.object({
  name: z.string().min(1, "プラン名を入力してください").max(50),
  description: z.string().max(500).optional().nullable(),
  price: z.coerce.number().int().min(0, "料金は0円以上にしてください"),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  sort_order: z.coerce.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
});

type TierRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number | null;
  sort_order: number;
  is_active: boolean;
};

// GET: 一覧（公開エンドポイントとしても使用される）
export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("event_ticket_tiers")
      .select("id, event_id, name, description, price, capacity, sort_order, is_active")
      .eq("event_id", id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("price", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ tiers: (data ?? []) as TierRow[] });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// POST: 新規作成（PRO 限定）
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const hasAccess = await canManageEvent(supabase, id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "このイベントを編集する権限がありません" },
        { status: 403 }
      );
    }

    const pro = await isProUser(supabase, user.id);
    if (!pro) {
      return NextResponse.json(
        {
          error: "複数プランの追加は PRO プランの機能です",
          requires_pro: true,
        },
        { status: 402 }
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = tierSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const first =
        fieldErrors.name?.[0] ??
        fieldErrors.price?.[0] ??
        "入力内容に誤りがあります";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("event_ticket_tiers")
      .insert({
        event_id: id,
        ...parsed.data,
      } as never)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/events/[id]/tiers] error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ tier: data });
  } catch (err) {
    console.error("[POST /api/events/[id]/tiers] unexpected:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
