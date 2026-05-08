import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type TagRow = {
  id: number;
  slug: string;
  name: string;
  tag_type: "format" | "level" | "tool" | "topic";
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // optional filter

  try {
    const supabase = await createClient();
    let query = (
      supabase.from as unknown as (table: string) => ReturnType<
        typeof supabase.from
      >
    )("event_tags")
      .select("id, slug, name, tag_type")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (type && ["format", "level", "tool", "topic"].includes(type)) {
      query = query.eq("tag_type", type);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ tags: [], error: error.message }, { status: 200 });
    }
    return NextResponse.json({ tags: (data ?? []) as TagRow[] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ tags: [], error: msg }, { status: 200 });
  }
}
