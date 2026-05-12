import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type FollowState = {
  isFollowing: boolean;
  followerCount: number;
};

const FOLLOWS = "follows" as const;

type AdminQuery = ReturnType<ReturnType<typeof createAdminClient>["from"]>;

function fromFollows(admin: ReturnType<typeof createAdminClient>) {
  return (admin.from as unknown as (table: string) => AdminQuery)(FOLLOWS);
}

export async function getFollowerCount(organizerId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await fromFollows(admin)
    .select("*", { count: "exact", head: true })
    .eq("organizer_id", organizerId);
  return count ?? 0;
}

export async function getFollowState(
  organizerId: string
): Promise<FollowState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const followerCount = await getFollowerCount(organizerId);

  if (!user) return { isFollowing: false, followerCount };
  if (user.id === organizerId) return { isFollowing: false, followerCount };

  const admin = createAdminClient();
  const { data } = await fromFollows(admin)
    .select("id")
    .eq("follower_id", user.id)
    .eq("organizer_id", organizerId)
    .maybeSingle();

  return { isFollowing: Boolean(data), followerCount };
}

export async function follow(
  followerId: string,
  organizerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (followerId === organizerId) {
    return { ok: false, error: "自分自身をフォローすることはできません" };
  }

  const admin = createAdminClient();
  const { error } = await fromFollows(admin).insert({
    follower_id: followerId,
    organizer_id: organizerId,
  });

  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function updateFollowChannels(
  followerId: string,
  organizerId: string,
  channels: { notify_email?: boolean; notify_line?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const updates: Record<string, boolean> = {};
  if (typeof channels.notify_email === "boolean")
    updates.notify_email = channels.notify_email;
  if (typeof channels.notify_line === "boolean")
    updates.notify_line = channels.notify_line;
  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "更新する項目がありません" };
  }
  const admin = createAdminClient();
  const { error } = await fromFollows(admin)
    .update(updates)
    .eq("follower_id", followerId)
    .eq("organizer_id", organizerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unfollow(
  followerId: string,
  organizerId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { error } = await fromFollows(admin)
    .delete()
    .eq("follower_id", followerId)
    .eq("organizer_id", organizerId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
