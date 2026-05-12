import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FAVORITES = "event_favorites" as const;

type AdminQuery = ReturnType<ReturnType<typeof createAdminClient>["from"]>;

function fromFavorites(admin: ReturnType<typeof createAdminClient>) {
  return (admin.from as unknown as (table: string) => AdminQuery)(FAVORITES);
}

export async function isFavorited(
  userId: string,
  eventId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await fromFavorites(admin)
    .select("event_id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();
  return !!data;
}

/**
 * ログイン中ユーザーがこのイベントをお気に入りしているか。
 * 未ログインは false 固定。
 */
export async function getFavoriteState(eventId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return isFavorited(user.id, eventId);
}

export async function addFavorite(
  userId: string,
  eventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { error } = await fromFavorites(admin).insert({
    user_id: userId,
    event_id: eventId,
  });
  // 23505 = unique_violation: 既にお気に入り済 → 冪等として成功扱い
  if (error && error.code !== "23505") {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function removeFavorite(
  userId: string,
  eventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { error } = await fromFavorites(admin)
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
