import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ─── Validation ──────────────────────────────────────────────

const updateEventSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  description: z.string().min(1, "説明を入力してください"),
  datetime: z.string().min(1, "日時を入力してください"),
  location: z.string().min(1, "場所を入力してください"),
  capacity: z.coerce
    .number()
    .int()
    .min(1, "定員は1名以上にしてください")
    .max(10000),
  price: z.coerce.number().int().min(0, "料金は0円以上にしてください"),
  image_url: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  teacher_name: z.string().optional().nullable(),
  teacher_bio: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  is_published: z.boolean().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────

function checkEnvVars(): NextResponse | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { error: "Supabase環境変数が設定されていません。.env.localを確認してください。" },
      { status: 503 }
    );
  }
  return null;
}

// ─── GET /api/events/[id] ────────────────────────────────────

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await props.params;
    const supabase = await createClient();

    const { data: event, error } = await supabase
      .from("events")
      .select(`
        *,
        booking_count:bookings(count)
      `)
      .eq("id", id)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const count = Array.isArray(event.booking_count)
      ? (event.booking_count[0] as { count: number } | undefined)?.count ?? 0
      : (event.booking_count as unknown as number) ?? 0;

    return NextResponse.json({ event: { ...event, booking_count: Number(count) } });
  } catch (err) {
    console.error("[GET /api/events/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/events/[id] ────────────────────────────────────

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await props.params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    // Fetch existing event to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("events")
      .select("id, creator_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    if (existing.creator_id !== user.id) {
      return NextResponse.json(
        { error: "このイベントを編集する権限がありません" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);
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

    const { data: event, error } = await supabase
      .from("events")
      .update({
        title: data.title,
        description: data.description,
        datetime: data.datetime,
        location: data.location,
        capacity: data.capacity,
        price: data.price,
        image_url: data.image_url || null,
        teacher_name: data.teacher_name || null,
        teacher_bio: data.teacher_bio || null,
        category: data.category || null,
        is_published: data.is_published,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !event) {
      console.error("[PUT /api/events/[id]] Supabase error:", error);
      return NextResponse.json(
        { error: "イベントの更新に失敗しました" },
        { status: 500 }
      );
    }

    // Get booking count
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "confirmed");

    return NextResponse.json({ event: { ...event, booking_count: bookingCount ?? 0 } });
  } catch (err) {
    console.error("[PUT /api/events/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/events/[id] ─────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await props.params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    // Fetch existing event to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("events")
      .select("id, creator_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    if (existing.creator_id !== user.id) {
      return NextResponse.json(
        { error: "このイベントを削除する権限がありません" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/events/[id]] Supabase error:", error);
      return NextResponse.json(
        { error: "イベントの削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/events/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
