import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { isProUser } from "@/lib/pro-plan";

// ─── /api/events/[id]/tiers/[tierId] ─────────────────────────
// チケット種別の更新 / 削除。PRO 機能。

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  price: z.coerce.number().int().min(0).optional(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  sort_order: z.coerce.number().int().optional(),
  is_active: z.boolean().optional(),
});

async function gate(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "認証が必要です" }, { status: 401 }),
    };
  }
  const hasAccess = await canManageEvent(supabase, eventId, user.id);
  if (!hasAccess) {
    return {
      error: NextResponse.json(
        { error: "このイベントを編集する権限がありません" },
        { status: 403 }
      ),
    };
  }
  const pro = await isProUser(supabase, user.id);
  if (!pro) {
    return {
      error: NextResponse.json(
        { error: "PRO プラン機能です", requires_pro: true },
        { status: 402 }
      ),
    };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      ),
    };
  }
  return { admin: createAdminClient() };
}

// PUT
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string; tierId: string }> }
) {
  try {
    const { id, tierId } = await props.params;
    const g = await gate(id);
    if (g.error) return g.error;
    const admin = g.admin!;

    const raw = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "入力内容に誤りがあります" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("event_ticket_tiers")
      .update(parsed.data as never)
      .eq("id", tierId)
      .eq("event_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ tier: data });
  } catch (err) {
    console.error("[PUT tier] unexpected:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// DELETE
export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string; tierId: string }> }
) {
  try {
    const { id, tierId } = await props.params;
    const g = await gate(id);
    if (g.error) return g.error;
    const admin = g.admin!;

    const { error } = await admin
      .from("event_ticket_tiers")
      .delete()
      .eq("id", tierId)
      .eq("event_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE tier] unexpected:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
