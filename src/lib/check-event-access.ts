import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Email addresses with super-admin access to all events. */
const SUPER_ADMIN_EMAILS = ["imatoru@gmail.com"];

/**
 * Check if a user is a super-admin (can manage all events).
 */
export async function isSuperAdmin(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return false;
  return SUPER_ADMIN_EMAILS.includes(user.email ?? "");
}

/**
 * Check if a user can manage an event (creator, accepted co-admin, or super-admin).
 */
export async function canManageEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId: string
): Promise<boolean> {
  // Check if user is the creator
  const { data: event } = await supabase
    .from("events")
    .select("creator_id")
    .eq("id", eventId)
    .single();

  if (!event) return false;
  if (event.creator_id === userId) return true;

  // Check if user is an accepted co-admin
  const { data: admin } = await supabase
    .from("event_admins")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("status", "accepted")
    .maybeSingle();

  if (admin) return true;

  // Check super-admin
  return isSuperAdmin(supabase, userId);
}

/**
 * Check if a user is the event creator (not just co-admin).
 */
export async function isEventCreator(
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId: string
): Promise<boolean> {
  const { data: event } = await supabase
    .from("events")
    .select("creator_id")
    .eq("id", eventId)
    .single();

  return event?.creator_id === userId;
}
