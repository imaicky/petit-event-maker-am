import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart, Users, ChevronRight } from "lucide-react";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type FollowedOrganizer = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  upcoming_count: number;
  followed_at: string;
};

async function getFollowedOrganizers(
  userId: string
): Promise<FollowedOrganizer[]> {
  const admin = createAdminClient();

  // 1. 自分がフォローしている主催者IDを取得
  const { data: follows } = await (
    admin.from as unknown as (
      t: string
    ) => ReturnType<typeof admin.from>
  )("follows")
    .select("organizer_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });

  const followsRows = (follows ?? []) as Array<{
    organizer_id: string;
    created_at: string;
  }>;
  if (followsRows.length === 0) return [];

  const orgIds = followsRows.map((f) => f.organizer_id);

  // 2. プロフィール取得
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .in("id", orgIds);

  const profileMap = new Map(
    ((profiles ?? []) as Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
    }>).map((p) => [p.id, p])
  );

  // 3. 各主催者の今後のイベント数を取得
  const now = new Date().toISOString();
  const { data: upcomingEvents } = await admin
    .from("events")
    .select("creator_id")
    .in("creator_id", orgIds)
    .eq("is_published", true)
    .gte("datetime", now);
  const countMap: Record<string, number> = {};
  for (const e of (upcomingEvents ?? []) as Array<{ creator_id: string }>) {
    countMap[e.creator_id] = (countMap[e.creator_id] ?? 0) + 1;
  }

  // 4. follow順を保ったまま結合
  const result: FollowedOrganizer[] = [];
  for (const f of followsRows) {
    const p = profileMap.get(f.organizer_id);
    if (!p) continue;
    result.push({
      ...p,
      upcoming_count: countMap[f.organizer_id] ?? 0,
      followed_at: f.created_at,
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
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return iso;
  }
}

export default async function MyFollowsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  let organizers: FollowedOrganizer[] = [];
  try {
    organizers = await getFollowedOrganizers(user.id);
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
          <Heart className="h-5 w-5 text-[#C26A4A]" />
          <h1 className="text-xl font-bold text-[#1A1A1A]">
            フォロー中の主催者
          </h1>
          <span className="rounded-full bg-[#F2F2F2] px-2 py-0.5 text-xs tabular-nums text-[#666666]">
            {organizers.length}
          </span>
        </div>

        {organizers.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-[#999999]" />
            <p className="mb-4 text-sm text-[#666666]">
              まだ誰もフォローしていません
            </p>
            <p className="mb-5 text-xs text-[#999999]">
              気になる主催者をフォローすると、新しいイベントの公開を見逃しません
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-5 py-2 text-sm font-medium text-white"
            >
              主催者を探す
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {organizers.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/${org.username}`}
                  className="flex items-center gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-4 hover:border-[#1A1A1A]/30 hover:shadow-sm transition-all"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-white text-lg font-bold overflow-hidden">
                    {org.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={org.avatar_url}
                        alt={org.display_name ?? org.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (org.display_name ?? org.username).slice(0, 1)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#1A1A1A] truncate">
                      {org.display_name ?? org.username}
                    </p>
                    <p className="text-xs text-[#999999] truncate">
                      @{org.username}
                    </p>
                    {org.bio && (
                      <p className="mt-1 text-xs text-[#666666] line-clamp-1">
                        {org.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {org.upcoming_count > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF1ED] px-2 py-0.5 text-[10px] font-medium text-[#C26A4A]">
                        開催予定 {org.upcoming_count}
                      </span>
                    )}
                    <span className="text-[10px] text-[#999999]">
                      {formatDate(org.followed_at)}〜
                    </span>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-[#999999]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
