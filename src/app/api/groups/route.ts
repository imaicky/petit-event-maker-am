import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "スラッグは小文字英数字とハイフンのみ",
    }),
  description: z.string().max(2000).optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
  tagline: z.string().max(140).optional().nullable(),
  website_url: z.string().url().optional().nullable(),
  discord_url: z.string().url().optional().nullable(),
  slack_url: z.string().url().optional().nullable(),
  substack_url: z.string().url().optional().nullable(),
  youtube_url: z.string().url().optional().nullable(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  is_published: z.boolean().optional().default(true),
});

type AdminFromAny = (table: string) => ReturnType<
  ReturnType<typeof createAdminClient>["from"]
>;
const fromTable = (admin: ReturnType<typeof createAdminClient>, name: string) =>
  (admin.from as unknown as AdminFromAny)(name);

// ─── GET /api/groups: 公開グループ一覧 ─────────────────────────
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ groups: [] });
  }
  const admin = createAdminClient();
  const { data } = await fromTable(admin, "event_groups")
    .select(
      "id, slug, name, description, cover_url, tagline, owner_id, category_id, created_at"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);
  return NextResponse.json({ groups: data ?? [] });
}

// ─── POST /api/groups: グループ作成（要認証）─────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    );
  }

  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "入力に誤りがあります",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバ設定エラー" }, { status: 500 });
  }
  const admin = createAdminClient();
  const { data, error } = await fromTable(admin, "event_groups")
    .insert({
      owner_id: user.id,
      ...parsed.data,
    })
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "このスラッグは既に使われています" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ group: data }, { status: 201 });
}
