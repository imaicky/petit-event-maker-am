import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ─── Validation ──────────────────────────────────────────────

const reviewSchema = z.object({
  reviewer_name: z
    .string()
    .min(1, "お名前を入力してください")
    .max(50, "お名前は50文字以内で入力してください"),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z
    .string()
    .min(1, "コメントを入力してください")
    .max(1000, "コメントは1000文字以内で入力してください"),
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET /api/events/[id]/reviews ────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify event exists
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", id)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/events/[id]/reviews] Supabase error:", error);
      return NextResponse.json(
        { error: "レビューの取得に失敗しました" },
        { status: 500 }
      );
    }

    const count = reviews?.length ?? 0;
    const average =
      count > 0
        ? Math.round(
            (reviews!.reduce((acc, r) => acc + r.rating, 0) / count) * 10
          ) / 10
        : null;

    return NextResponse.json({ reviews: reviews ?? [], average, count });
  } catch (err) {
    console.error("[GET /api/events/[id]/reviews] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── POST /api/events/[id]/reviews ───────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify event exists
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", id)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "入力内容に誤りがあります",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        event_id: id,
        reviewer_name: parsed.data.reviewer_name,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      })
      .select()
      .single();

    if (error || !review) {
      console.error("[POST /api/events/[id]/reviews] Supabase error:", error);
      return NextResponse.json(
        { error: "レビューの投稿に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/events/[id]/reviews] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
