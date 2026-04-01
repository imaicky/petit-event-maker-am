import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Validation ──────────────────────────────────────────────

const customFieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "date", "select"]),
  label: z.string().min(1, "カスタムフィールドの名前を入力してください"),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

const updateMenuSchema = z.object({
  title: z
    .string()
    .min(1, "メニュー名を入力してください")
    .max(100, "メニュー名は100文字以内で入力してください"),
  description: z.string().optional().nullable(),
  price: z.coerce.number().int().min(0, "料金は0円以上にしてください"),
  price_note: z.string().max(100).optional().nullable(),
  image_url: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
  custom_fields: z.array(customFieldSchema).optional().default([]),
  is_published: z.boolean().optional(),
  category: z.string().optional().nullable(),
});

// ─── GET /api/menus/[id] ────────────────────────────────────

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    // Use admin client to bypass RLS (allows fetching unpublished menus for edit page)
    const admin = createAdminClient();

    const { data: menu, error } = await admin
      .from("menus")
      .select(`
        *,
        booking_count:menu_bookings(count)
      `)
      .eq("id", id)
      .single();

    if (error || !menu) {
      return NextResponse.json(
        { error: "メニューが見つかりません" },
        { status: 404 }
      );
    }

    const count = Array.isArray(menu.booking_count)
      ? (menu.booking_count[0] as { count: number } | undefined)?.count ?? 0
      : (menu.booking_count as unknown as number) ?? 0;

    // Fetch creator's LINE friend-add URL
    let lineFriendUrl: string | null = null;
    if (menu.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        const { data: lineAccount } = await admin
          .from("line_accounts")
          .select("bot_basic_id")
          .eq("user_id", menu.creator_id)
          .eq("is_active", true)
          .maybeSingle();
        if (lineAccount?.bot_basic_id) {
          lineFriendUrl = `https://line.me/R/ti/p/${lineAccount.bot_basic_id}`;
        }
      } catch {
        // non-critical
      }
    }

    // Fetch creator profile
    const { data: creator } = await admin
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", menu.creator_id)
      .single();

    return NextResponse.json({
      menu: {
        ...menu,
        booking_count: Number(count),
        line_friend_url: lineFriendUrl,
        creator,
      },
    });
  } catch (err) {
    console.error("[GET /api/menus/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/menus/[id] ────────────────────────────────────

export async function PUT(
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
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    // Use admin client for all DB operations (auth already verified above)
    const adminForFetch = createAdminClient();
    const { data: existing, error: fetchError } = await adminForFetch
      .from("menus")
      .select("id, creator_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "メニューが見つかりません" },
        { status: 404 }
      );
    }

    if (existing.creator_id !== user.id) {
      return NextResponse.json(
        { error: "このメニューを編集する権限がありません" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateMenuSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "入力内容に誤りがあります",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Use admin client for update (auth already verified above)
    const admin = createAdminClient();
    const { data: menu, error } = await admin
      .from("menus")
      .update({
        title: data.title,
        description: data.description || null,
        price: data.price,
        price_note: data.price_note || null,
        image_url: data.image_url || null,
        capacity: data.capacity ?? null,
        custom_fields: data.custom_fields,
        is_published: data.is_published,
        category: data.category || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !menu) {
      console.error("[PUT /api/menus/[id]] Supabase error:", error);
      return NextResponse.json(
        { error: "メニューの更新に失敗しました" },
        { status: 500 }
      );
    }

    const { count: bookingCount } = await admin
      .from("menu_bookings")
      .select("*", { count: "exact", head: true })
      .eq("menu_id", id)
      .eq("status", "confirmed");

    return NextResponse.json({ menu: { ...menu, booking_count: bookingCount ?? 0 } });
  } catch (err) {
    console.error("[PUT /api/menus/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/menus/[id] ─────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    const adminForCheck = createAdminClient();
    const { data: existing, error: fetchError } = await adminForCheck
      .from("menus")
      .select("id, creator_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "メニューが見つかりません" },
        { status: 404 }
      );
    }

    if (existing.creator_id !== user.id) {
      return NextResponse.json(
        { error: "このメニューを削除する権限がありません" },
        { status: 403 }
      );
    }

    // Use admin client for delete (auth already verified above)
    const admin = createAdminClient();
    const { error } = await admin.from("menus").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/menus/[id]] Supabase error:", error);
      return NextResponse.json(
        { error: "メニューの削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/menus/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
