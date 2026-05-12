import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { DismissButton } from "@/components/dismiss-button";
import { buildPersonalizedFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export async function PersonalizedFeed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let events;
  try {
    events = await buildPersonalizedFeed(user.id);
  } catch {
    return null;
  }

  if (!events.length) return null;

  // 上位6件のみ表示
  const top = events.slice(0, 6);

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#C26A4A]" />
          <h2 className="text-base font-bold text-[#1A1A1A]">
            あなたへのおすすめ
          </h2>
          <span className="rounded-full bg-[#FAF1ED] px-2 py-0.5 text-[10px] font-medium text-[#C26A4A]">
            AI推薦
          </span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((ev) => (
          <div key={ev.id} className="relative">
            <DismissButton eventId={ev.id} />
            <EventCard
              id={ev.id}
              title={ev.title}
              datetime={ev.datetime}
              location={ev.location ?? ""}
              location_type={ev.location_type ?? null}
              is_limited={ev.is_limited}
              price={ev.price}
              capacity={ev.capacity ?? 0}
              booked_count={ev.booking_count}
              image_url={ev.image_url ?? undefined}
              category={ev.category_name ?? ev.category ?? undefined}
              teacher_name={ev.teacher_name ?? undefined}
              short_code={ev.short_code}
            />
            {ev.reasons.length > 0 && (
              <div className="pointer-events-none absolute top-3 right-3 z-[2] flex flex-col items-end gap-1">
                {ev.reasons.slice(0, 1).map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#C26A4A] shadow-sm ring-1 ring-[#C26A4A]/20 backdrop-blur-sm"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {events.length > 6 && (
        <div className="mt-4 text-right">
          <Link
            href="/explore?sort=foryou"
            className="inline-flex items-center gap-1 text-xs text-[#666666] hover:text-[#1A1A1A]"
          >
            もっと見る
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
