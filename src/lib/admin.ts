import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check if user is admin. Returns the target_user_id to use for queries.
 * If target_user_id is provided and user is admin, returns target_user_id.
 * Otherwise returns the user's own ID.
 */
export async function resolveTargetUser(
  userId: string,
  targetUserIdParam: string | null
): Promise<{ targetUserId: string; isAdmin: boolean }> {
  if (!targetUserIdParam || targetUserIdParam === userId) {
    return { targetUserId: userId, isAdmin: false };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (!profile?.is_admin) {
    throw new Error("FORBIDDEN");
  }

  return { targetUserId: targetUserIdParam, isAdmin: true };
}
