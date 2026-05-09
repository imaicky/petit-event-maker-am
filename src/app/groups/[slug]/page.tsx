import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Globe, MessageCircle } from "lucide-react";
import { Header } from "@/components/header";
import { EventCard } from "@/components/event-card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  tagline: string | null;
  website_url: string | null;
  discord_url: string | null;
  slack_url: string | null;
  substack_url: string | null;
  youtube_url: string | null;
  owner_id: string;
};

type GroupEvent = {
  id: string;
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  capacity: number | null;
  price: number;
  image_url: string | null;
  category: string | null;
  short_code: string | null;
  is_limited: boolean;
  series_index: number | null;
  teacher_name: string | null;
};

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) notFound();
  const admin = createAdminClient();

  const { data: groupRow } = await (
    admin.from as unknown as (
      t: string
    ) => ReturnType<typeof admin.from>
  )("event_groups")
    .select(
      "id, slug, name, description, cover_url, tagline, website_url, discord_url, slack_url, substack_url, youtube_url, owner_id, is_published"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!groupRow) notFound();
  const group = groupRow as Group & { is_published: boolean };

  // 所有者プロフィール
  const { data: ownerRow } = await admin
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", group.owner_id)
    .single();
  const owner = ownerRow as {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;

  // グループ所属のイベント
  const { data: eventRows } = await admin
    .from("events")
    .select(
      "id, title, datetime, location, location_type, capacity, price, image_url, category, short_code, is_limited, series_index, teacher_name"
    )
    .eq("group_id", group.id)
    .eq("is_published", true)
    .order("datetime", { ascending: true });
  const events = (eventRows ?? []) as GroupEvent[];
  const now = Date.now();
  const upcoming = events.filter(
    (e) => new Date(e.datetime).getTime() >= now
  );
  const past = events.filter((e) => new Date(e.datetime).getTime() < now);

  // フォロワー数
  const { count: followerCount } = await admin
    .from("group_followers" as never)
    .select("*", { count: "exact", head: true })
    .eq("group_id", group.id);

  // 自分がフォロー済みかどうか
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isFollowing = false;
  if (user) {
    const { data: f } = await admin
      .from("group_followers" as never)
      .select("id")
      .eq("group_id", group.id)
      .eq("follower_id", user.id)
      .maybeSingle();
    isFollowing = Boolean(f);
  }
  const isOwner = user?.id === group.owner_id;

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/groups"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          グループ一覧に戻る
        </Link>

        {/* Cover */}
        <div className="mb-6 aspect-[3/1] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A1A1A] via-[#404040] to-[#888888]">
          {group.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.cover_url}
              alt={group.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-[#1A1A1A]">{group.name}</h1>
              {group.tagline && (
                <p className="mt-1 text-sm text-[#C26A4A]">{group.tagline}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#666666]">
                {owner && (
                  <Link
                    href={`/${owner.username}`}
                    className="inline-flex items-center gap-1.5 hover:text-[#1A1A1A]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold overflow-hidden">
                      {owner.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={owner.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (owner.display_name ?? owner.username).slice(0, 1)
                      )}
                    </span>
                    主催: {owner.display_name ?? owner.username}
                  </Link>
                )}
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {followerCount ?? 0} フォロワー
                </span>
                <span>{events.length} イベント開催</span>
              </div>
            </div>

            {!isOwner && user && (
              <FollowToggle slug={slug} initialFollowing={isFollowing} />
            )}
            {!user && (
              <Link
                href={`/auth?redirect=${encodeURIComponent(`/groups/${slug}`)}`}
                className="rounded-full bg-[#1A1A1A] px-4 py-1.5 text-sm font-medium text-white"
              >
                ログインしてフォロー
              </Link>
            )}
          </div>

          {group.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm text-[#333333] leading-relaxed">
              {group.description}
            </p>
          )}

          {/* External links */}
          <div className="mt-4 flex flex-wrap gap-2">
            {group.website_url && (
              <a
                href={group.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] bg-white px-3 py-1 text-xs text-[#666666] hover:text-[#1A1A1A]"
              >
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
            {group.discord_url && (
              <a
                href={group.discord_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[#5865F2]/30 bg-[#5865F2]/5 px-3 py-1 text-xs text-[#5865F2]"
              >
                <MessageCircle className="h-3 w-3" /> Discord
              </a>
            )}
            {group.substack_url && (
              <a
                href={group.substack_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[#FF6719]/30 bg-[#FF6719]/5 px-3 py-1 text-xs text-[#FF6719]"
              >
                Substack
              </a>
            )}
            {group.youtube_url && (
              <a
                href={group.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-[#FF0000]/30 bg-[#FF0000]/5 px-3 py-1 text-xs text-[#FF0000]"
              >
                YouTube
              </a>
            )}
          </div>
        </div>

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-base font-bold text-[#1A1A1A]">
              開催予定 ({upcoming.length})
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <EventCard
                  key={e.id}
                  id={e.id}
                  title={
                    e.series_index
                      ? `第${e.series_index}回: ${e.title}`
                      : e.title
                  }
                  datetime={e.datetime}
                  location={e.location ?? ""}
                  location_type={e.location_type}
                  is_limited={e.is_limited}
                  price={e.price}
                  capacity={e.capacity ?? 0}
                  booked_count={0}
                  image_url={e.image_url ?? undefined}
                  category={e.category ?? undefined}
                  teacher_name={e.teacher_name ?? undefined}
                  short_code={e.short_code}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past events */}
        {past.length > 0 && (
          <section>
            <h2 className="mb-4 text-base font-bold text-[#666666]">
              過去のイベント ({past.length})
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {past.slice(0, 9).map((e) => (
                <EventCard
                  key={e.id}
                  id={e.id}
                  title={
                    e.series_index
                      ? `第${e.series_index}回: ${e.title}`
                      : e.title
                  }
                  datetime={e.datetime}
                  location={e.location ?? ""}
                  location_type={e.location_type}
                  is_limited={e.is_limited}
                  price={e.price}
                  capacity={e.capacity ?? 0}
                  booked_count={0}
                  image_url={e.image_url ?? undefined}
                  category={e.category ?? undefined}
                  teacher_name={e.teacher_name ?? undefined}
                  short_code={e.short_code}
                />
              ))}
            </div>
          </section>
        )}

        {events.length === 0 && (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-12 text-center">
            <p className="text-sm text-[#666666]">
              このグループにはまだイベントがありません
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

// クライアントコンポーネント
function FollowToggle({
  slug,
  initialFollowing,
}: {
  slug: string;
  initialFollowing: boolean;
}) {
  // SSRなので初期表示はインタラクティブでない静的UI
  return (
    <form
      action={`/api/groups/${slug}/follow`}
      method={initialFollowing ? "DELETE" : "POST"}
      className="shrink-0"
    >
      <button
        type="submit"
        className={`rounded-full px-4 py-1.5 text-sm font-medium ${
          initialFollowing
            ? "border border-[#E5E5E5] bg-white text-[#666666] hover:bg-[#FAFAFA]"
            : "bg-[#C26A4A] text-white hover:bg-[#A85535]"
        }`}
      >
        {initialFollowing ? "フォロー中" : "フォローする"}
      </button>
    </form>
  );
}
