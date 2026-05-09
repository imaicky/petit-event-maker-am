import { createAdminClient } from "@/lib/supabase/admin";

const VIEWS_TABLE = "event_views" as const;

export type AttributionSource = {
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
};

export type RecordViewInput = {
  event_id: string;
  user_id?: string | null;
  anon_id?: string | null;
  user_agent?: string | null;
} & AttributionSource;

type AdminFromAny = (table: string) => ReturnType<
  ReturnType<typeof createAdminClient>["from"]
>;

function fromTable(name: string) {
  const admin = createAdminClient();
  return (admin.from as unknown as AdminFromAny)(name);
}

/**
 * 閲覧ログを記録する。RLS は INSERT 許可 + SELECT 拒否なので
 * 必ず admin client 経由で書込みする。重複記録は許容（生データを残す）。
 */
export async function recordEventView(input: RecordViewInput): Promise<void> {
  try {
    await fromTable(VIEWS_TABLE).insert({
      event_id: input.event_id,
      user_id: input.user_id ?? null,
      anon_id: input.anon_id ?? null,
      referrer: input.referrer ?? null,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      user_agent: input.user_agent ?? null,
    });
  } catch {
    // 計測失敗でユーザーフローを止めない
  }
}

/**
 * Funnel + sources + participant breakdown for an event.
 */
export type EventInsights = {
  total_views: number;
  unique_views: number;
  bookings_confirmed: number;
  bookings_waitlisted: number;
  bookings_cancelled: number;
  conversion_rate: number; // confirmed / unique_views
  views_by_day: Array<{ date: string; count: number }>;
  top_referrers: Array<{ source: string; count: number }>;
  top_utm_sources: Array<{ source: string; count: number }>;
};

const TOP_LIMIT = 8;

export function bucket(arr: Array<string | null | undefined>): Array<{ source: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const v of arr) {
    if (!v) continue;
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_LIMIT);
}

/**
 * URLからホスト名（短縮表示）を取り出す。値がドメインでない場合はそのまま返す。
 */
export function shortenReferrer(ref: string | null | undefined): string | null {
  if (!ref) return null;
  try {
    const url = new URL(ref);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return ref;
  }
}

export async function getEventInsights(
  eventId: string,
  options?: { daysBack?: number }
): Promise<EventInsights> {
  const days = options?.daysBack ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Views
  const { data: viewsRaw } = await fromTable(VIEWS_TABLE)
    .select("user_id, anon_id, referrer, utm_source, utm_medium, utm_campaign, viewed_at")
    .eq("event_id", eventId)
    .gte("viewed_at", since);

  const views = (viewsRaw ?? []) as Array<{
    user_id: string | null;
    anon_id: string | null;
    referrer: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    viewed_at: string;
  }>;

  const unique = new Set<string>();
  for (const v of views) {
    const key = v.user_id ?? v.anon_id ?? Math.random().toString();
    unique.add(key);
  }

  // Daily aggregation
  const dayMap: Record<string, number> = {};
  for (const v of views) {
    const day = v.viewed_at.slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }
  const views_by_day = Object.entries(dayMap)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  // Bookings
  const { data: bookingsRaw } = await fromTable("bookings")
    .select("status")
    .eq("event_id", eventId);
  const bookings = (bookingsRaw ?? []) as Array<{ status: string }>;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const waitlisted = bookings.filter((b) => b.status === "waitlisted").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  return {
    total_views: views.length,
    unique_views: unique.size,
    bookings_confirmed: confirmed,
    bookings_waitlisted: waitlisted,
    bookings_cancelled: cancelled,
    conversion_rate:
      unique.size > 0 ? Math.round((confirmed / unique.size) * 1000) / 10 : 0,
    views_by_day,
    top_referrers: bucket(views.map((v) => shortenReferrer(v.referrer))),
    top_utm_sources: bucket(views.map((v) => v.utm_source)),
  };
}
