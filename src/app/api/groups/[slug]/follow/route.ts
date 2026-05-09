import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AdminFromAny = (table: string) => ReturnType<
  ReturnType<typeof createAdminClient>["from"]
>;
const fromTable = (admin: ReturnType<typeof createAdminClient>, name: string) =>
  (admin.from as unknown as AdminFromAny)(name);

async function resolveGroupId(slug: string): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createAdminClient();
  const { data } = await fromTable(admin, "event_groups")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const groupId = await resolveGroupId(slug);
  if (!groupId) {
    return NextResponse.json(
      { error: "グループが見つかりません" },
      { status: 404 }
    );
  }

  const admin = createAdminClient();
  const { error } = await fromTable(admin, "group_followers").insert({
    follower_id: user.id,
    group_id: groupId,
  });

  if (error && (error as { code?: string }).code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const groupId = await resolveGroupId(slug);
  if (!groupId) {
    return NextResponse.json(
      { error: "グループが見つかりません" },
      { status: 404 }
    );
  }

  const admin = createAdminClient();
  const { error } = await fromTable(admin, "group_followers")
    .delete()
    .eq("follower_id", user.id)
    .eq("group_id", groupId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
