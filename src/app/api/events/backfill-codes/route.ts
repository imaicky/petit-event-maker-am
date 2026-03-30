import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateShortCode } from "@/lib/short-code";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { data: events, error: fetchError } = await supabase
      .from("events")
      .select("id")
      .is("short_code", null);

    if (fetchError) {
      return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ message: "対象イベントなし", updated: 0 });
    }

    let updated = 0;
    for (const event of events) {
      const { error } = await supabase
        .from("events")
        .update({ short_code: generateShortCode() })
        .eq("id", event.id);
      if (!error) updated++;
    }

    return NextResponse.json({ message: `${updated}件更新しました`, updated });
  } catch (err) {
    console.error("[POST /api/events/backfill-codes]", err);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
