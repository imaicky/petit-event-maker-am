import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  parent_id: number | null;
  sort_order: number;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await (
      supabase.from as unknown as (table: string) => ReturnType<
        typeof supabase.from
      >
    )("event_categories")
      .select("id, slug, name, parent_id, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ categories: [], error: error.message }, { status: 200 });
    }
    return NextResponse.json({ categories: (data ?? []) as CategoryRow[] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ categories: [], error: msg }, { status: 200 });
  }
}
