import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPersonalizedFeed, buildPopularFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "auto"; // auto / foryou / popular

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let events;
  try {
    if (type === "popular" || !user) {
      events = await buildPopularFeed();
    } else {
      events = await buildPersonalizedFeed(user.id);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "feed_failed";
    console.error("[/api/feed] error:", msg);
    return NextResponse.json({ events: [], error: msg }, { status: 500 });
  }

  return NextResponse.json({
    events,
    count: events.length,
    personalized: !!user && type !== "popular",
  });
}
