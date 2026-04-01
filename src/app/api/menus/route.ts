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

const createMenuSchema = z.object({
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
  is_published: z.boolean().optional().default(false),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "スラッグは小文字英数字とハイフンのみ使用できます")
    .optional(),
  category: z.string().optional().nullable(),
});

// ─── Helpers ─────────────────────────────────────────────────

function generateSlug(): string {
  return `menu-${Date.now()}`;
}

// ─── POST /api/menus ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const parsed = createMenuSchema.safeParse(body);
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
    const slug = data.slug ?? generateSlug();

    // Use admin client for insert to bypass RLS (auth already verified above)
    const admin = createAdminClient();
    const { data: menu, error } = await admin
      .from("menus")
      .insert({
        creator_id: user.id,
        title: data.title,
        description: data.description || null,
        price: data.price,
        price_note: data.price_note || null,
        image_url: data.image_url || null,
        capacity: data.capacity ?? null,
        custom_fields: data.custom_fields,
        is_published: data.is_published ?? false,
        slug,
        category: data.category || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "このスラッグは既に使用されています。" },
          { status: 409 }
        );
      }
      console.error("[POST /api/menus] Supabase error:", error);
      return NextResponse.json(
        { error: "メニューの作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ menu: { ...menu, booking_count: 0 } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/menus] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── GET /api/menus ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Use admin client to bypass RLS (allows fetching unpublished menus for dashboard)
    const admin = createAdminClient();

    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creator_id");

    let query = admin
      .from("menus")
      .select(`
        *,
        booking_count:menu_bookings(count)
      `)
      .order("created_at", { ascending: false });

    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    } else {
      query = query.eq("is_published", true);
    }

    const { data: menus, error } = await query;

    if (error) {
      console.error("[GET /api/menus] Supabase error:", error);
      return NextResponse.json(
        { error: "メニューの取得に失敗しました" },
        { status: 500 }
      );
    }

    const normalised = (menus ?? []).map((m) => {
      const count = Array.isArray(m.booking_count)
        ? (m.booking_count[0] as { count: number } | undefined)?.count ?? 0
        : (m.booking_count as unknown as number) ?? 0;
      return { ...m, booking_count: Number(count) };
    });

    return NextResponse.json({ menus: normalised });
  } catch (err) {
    console.error("[GET /api/menus] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
