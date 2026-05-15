import Link from "next/link";
import { Calendar, MapPin, Video, ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 同じ主催者の今後の他のイベントを最大5件表示する compact 横スクロールリスト。
 * イベント詳細ページの下部に出す。
 * RelatedEvents（タグマッチで広く取る）と違い、こちらは「同一主催者」固定で
 * シリーズ意識を強める。
 */
type SeriesEvent = {
  id: string;
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  short_code: string | null;
};

async function getOrganizerSeries(
  currentEventId: string,
  creatorId: string,
  options?: { limit?: number }
): Promise<SeriesEvent[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const limit = options?.limit ?? 5;
  const now = new Date().toISOString();

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("events")
      .select(
        "id, title, datetime, location, location_type, short_code, is_published, is_limited"
      )
      .eq("creator_id", creatorId)
      .eq("is_published", true)
      .eq("is_limited", false)
      .neq("id", currentEventId)
      .gte("datetime", now)
      .order("datetime", { ascending: true })
      .limit(limit);
    return ((data ?? []) as SeriesEvent[]).map((e) => ({
      id: e.id,
      title: e.title,
      datetime: e.datetime,
      location: e.location,
      location_type: e.location_type,
      short_code: e.short_code,
    }));
  } catch {
    return [];
  }
}

function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return iso;
  }
}

export async function OrganizerSeries({
  currentEventId,
  creatorId,
  organizerName,
  organizerUsername,
}: {
  currentEventId: string;
  creatorId: string;
  organizerName: string | null;
  organizerUsername: string | null;
}) {
  const events = await getOrganizerSeries(currentEventId, creatorId);
  if (events.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl bg-[#FAFAFA] p-4 ring-1 ring-[#E5E5E5]/60">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#1A1A1A]">
          {organizerName ?? "主催者"}さんの今後のイベント
        </h2>
        {organizerUsername && (
          <Link
            href={`/${organizerUsername}`}
            className="inline-flex items-center gap-0.5 text-[11px] text-[#666666] hover:text-[#1A1A1A]"
          >
            プロフィール
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <ul className="space-y-2">
        {events.map((ev) => (
          <li key={ev.id}>
            <Link
              href={ev.short_code ? `/e/${ev.short_code}` : `/events/${ev.id}`}
              className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-[#E5E5E5] hover:ring-[#1A1A1A]/20 hover:shadow-sm transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#1A1A1A] line-clamp-1 group-hover:underline">
                  {ev.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#999999]">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateShort(ev.datetime)}
                  </span>
                  {ev.location_type === "online" ? (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      オンライン
                    </span>
                  ) : ev.location_type === "hybrid" ? (
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      ハイブリッド
                    </span>
                  ) : (
                    ev.location && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </span>
                    )
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#999999] group-hover:text-[#1A1A1A]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
