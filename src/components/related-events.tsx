import { Sparkles } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { getRelatedEvents } from "@/lib/related-events";

/**
 * イベント詳細ページ下部の「他のおすすめ」セクション。
 * 同カテゴリ・同タグ・同主催者のスコアで上位3件を表示。
 */
export async function RelatedEvents({ eventId }: { eventId: string }) {
  const events = await getRelatedEvents(eventId, { limit: 3 });
  if (events.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#C26A4A]" />
        <h2 className="text-base font-bold text-[#1A1A1A]">
          このイベントに興味があれば、こちらも
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((ev) => (
          <EventCard
            key={ev.id}
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
            category={ev.category ?? undefined}
            teacher_name={ev.teacher_name ?? undefined}
            short_code={ev.short_code}
            favorite_count={ev.favorite_count}
          />
        ))}
      </div>
    </section>
  );
}
