import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { broadcastLineMessage } from "@/lib/line";

// ─── Validation ──────────────────────────────────────────────

const createEventSchema = z.object({
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
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "スラッグは小文字英数字とハイフンのみ使用できます")
    .optional(),
  is_published: z.boolean().optional().default(true),
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

function generateSlug(title: string): string {
  const base = `event-${Date.now()}`;
  // try to create a readable slug from title (romanised approximation)
  return base;
}

// ─── POST /api/events ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
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

    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);
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
    const slug = data.slug ?? generateSlug(data.title);

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        creator_id: user.id,
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
        slug,
        is_published: data.is_published ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "このスラッグは既に使用されています。別のスラッグを指定してください。" },
          { status: 409 }
        );
      }
      console.error("[POST /api/events] Supabase error:", error);
      return NextResponse.json(
        { error: "イベントの作成に失敗しました" },
        { status: 500 }
      );
    }

    // Send LINE notification (async, non-blocking)
    if (event.is_published) {
      (async () => {
        try {
          const { data: lineAccount } = await supabase
            .from("line_accounts")
            .select("channel_access_token, is_active")
            .eq("user_id", user.id)
            .maybeSingle();

          if (lineAccount?.is_active && lineAccount.channel_access_token) {
            const dateStr = new Date(event.datetime).toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            });
            const message = [
              `🎉 新しいイベントが公開されました！`,
              ``,
              `📌 ${event.title}`,
              event.location ? `📍 ${event.location}` : null,
              `📅 ${dateStr}`,
              event.price > 0 ? `💰 ¥${event.price.toLocaleString()}` : `💰 無料`,
              ``,
              `詳細・予約はこちら👇`,
              `${process.env.NEXT_PUBLIC_BASE_URL || "https://example.com"}/events/${event.id}`,
            ]
              .filter(Boolean)
              .join("\n");

            await broadcastLineMessage(lineAccount.channel_access_token, message);
          }
        } catch (err) {
          console.error("[POST /api/events] LINE notification error:", err);
        }
      })();
    }

    // Augment with booking count (always 0 for new events)
    return NextResponse.json({ event: { ...event, booking_count: 0 } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/events] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── GET /api/events ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const creatorId = searchParams.get("creator_id");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    let query = supabase
      .from("events")
      .select(`
        *,
        booking_count:bookings(count)
      `)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("category", category);
    }
    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("[GET /api/events] Supabase error:", error);
      return NextResponse.json(
        { error: "イベントの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Flatten the aggregate count from the join
    const normalised = (events ?? []).map((e) => {
      const count = Array.isArray(e.booking_count)
        ? (e.booking_count[0] as { count: number } | undefined)?.count ?? 0
        : (e.booking_count as unknown as number) ?? 0;
      return { ...e, booking_count: Number(count) };
    });

    return NextResponse.json({ events: normalised });
  } catch (err) {
    console.error("[GET /api/events] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
