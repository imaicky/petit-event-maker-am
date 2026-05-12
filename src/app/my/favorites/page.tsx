import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart, Calendar, MapPin } from "lucide-react";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type FavoriteEvent = {
  id: string;
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  image_url: string | null;
  short_code: string | null;
  favorited_at: string;
};

async function getFavoriteEvents(userId: string): Promise<FavoriteEvent[]> {
  const admin = createAdminClient();
  const { data: favs } = await (
    admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
  )("event_favorites")
    .select("event_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const rows = (favs ?? []) as Array<{ event_id: string; created_at: string }>;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.event_id);
  const { data: events } = await admin
    .from("events")
    .select("id, title, datetime, location, location_type, image_url, short_code, is_published")
    .in("id", ids);

  const evMap = new Map<
    string,
    {
      id: string;
      title: string;
      datetime: string;
      location: string | null;
      location_type: string | null;
      image_url: string | null;
      short_code: string | null;
      is_published: boolean;
    }
  >(
    ((events ?? []) as Array<{
      id: string;
      title: string;
      datetime: string;
      location: string | null;
      location_type: string | null;
      image_url: string | null;
      short_code: string | null;
      is_published: boolean;
    }>).map((e) => [e.id, e])
  );

  const result: FavoriteEvent[] = [];
  for (const f of rows) {
    const ev = evMap.get(f.event_id);
    if (!ev) continue;
    // 非公開イベントは隠す（途中で下書き化された場合）
    if (!ev.is_published) continue;
    result.push({
      id: ev.id,
      title: ev.title,
      datetime: ev.datetime,
      location: ev.location,
      location_type: ev.location_type,
      image_url: ev.image_url,
      short_code: ev.short_code,
      favorited_at: f.created_at,
    });
  }
  return result;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
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

export default async function MyFavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  let events: FavoriteEvent[] = [];
  try {
    events = await getFavoriteEvents(user.id);
  } catch {
    // fallthrough
  }

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/my"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          マイページに戻る
        </Link>

        <div className="mb-6 flex items-center gap-2">
          <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
          <h1 className="text-xl font-bold text-[#1A1A1A]">お気に入り</h1>
          <span className="rounded-full bg-[#F2F2F2] px-2 py-0.5 text-xs tabular-nums text-[#666666]">
            {events.length}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 text-center">
            <Heart className="mx-auto mb-3 h-10 w-10 text-[#999999]" />
            <p className="mb-4 text-sm text-[#666666]">
              まだお気に入りがありません
            </p>
            <p className="mb-5 text-xs text-[#999999]">
              気になるイベントを「お気に入り」に登録すると、後で見返せます
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-5 py-2 text-sm font-medium text-white"
            >
              イベントを探す
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={ev.short_code ? `/e/${ev.short_code}` : `/events/${ev.id}`}
                  className="flex items-stretch gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-3 hover:border-[#1A1A1A]/30 hover:shadow-sm transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F2F2F2]">
                    {ev.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.image_url}
                        alt={ev.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">
                        🎉
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <p className="text-sm font-bold text-[#1A1A1A] line-clamp-2 leading-tight">
                      {ev.title}
                    </p>
                    <div className="mt-1 space-y-0.5 text-[11px] text-[#999999]">
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {formatDate(ev.datetime)}
                      </p>
                      {ev.location_type === "online" ? (
                        <p>🎥 オンライン</p>
                      ) : (
                        ev.location && (
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
