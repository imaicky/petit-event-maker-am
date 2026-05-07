// Auto-promote waitlisted bookings (FIFO) when an event's capacity grows.
//
// Used by PUT /api/events/[id]: when the organizer raises the capacity, we
// fill the freshly opened slots with the oldest waitlisted bookings and email
// them a confirmation that includes Zoom credentials and payment instructions.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { buildBookingEmail } from "@/lib/booking-email";

interface EventForPromotion {
  creator_id: string | null;
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  online_url: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  location_url: string | null;
  price: number;
}

export interface PromotionResult {
  promotedCount: number;
  promotedNames: string[];
}

const EMPTY: PromotionResult = { promotedCount: 0, promotedNames: [] };

export async function promoteWaitlistOnCapacityIncrease({
  admin,
  eventId,
  event,
  oldCapacity,
  newCapacity,
}: {
  admin: SupabaseClient;
  eventId: string;
  event: EventForPromotion;
  oldCapacity: number | null;
  newCapacity: number | null;
}): Promise<PromotionResult> {
  // Only promote when both capacities are concrete numbers and the new one is
  // strictly greater. NULL (= unlimited) doesn't make sense to "increase".
  if (
    typeof oldCapacity !== "number" ||
    typeof newCapacity !== "number" ||
    newCapacity <= oldCapacity
  ) {
    return EMPTY;
  }

  const { count: confirmedCount } = await admin
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "confirmed");

  const slotsOpening = newCapacity - (confirmedCount ?? 0);
  if (slotsOpening <= 0) return EMPTY;

  const { data: waitlist } = await admin
    .from("bookings")
    .select("id, guest_name, guest_email")
    .eq("event_id", eventId)
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true })
    .limit(slotsOpening);

  const toPromote = (waitlist ?? []) as Array<{
    id: string;
    guest_name: string;
    guest_email: string;
  }>;

  if (toPromote.length === 0) return EMPTY;

  const ids = toPromote.map((b) => b.id);
  const { error: promoteErr } = await admin
    .from("bookings")
    .update({ status: "confirmed" } as never)
    .in("id", ids);

  if (promoteErr) {
    console.error("[waitlist-promotion] update error:", promoteErr);
    return EMPTY;
  }

  // Resolve the creator's LINE friend-add URL once for all promoted bookings.
  const lineFriendUrl = await resolveLineFriendUrl(admin, event.creator_id);

  if (process.env.RESEND_API_KEY) {
    await Promise.all(
      toPromote.map((b) => sendPromotionEmail(admin, event, b, lineFriendUrl))
    );
  }

  return {
    promotedCount: toPromote.length,
    promotedNames: toPromote.map((b) => b.guest_name),
  };
}

async function resolveLineFriendUrl(
  admin: SupabaseClient,
  creatorId: string | null
): Promise<string | null> {
  if (!creatorId) return null;
  const { data } = await admin
    .from("line_accounts")
    .select("bot_basic_id")
    .eq("user_id", creatorId)
    .eq("is_active", true)
    .maybeSingle();
  const bot = (data as { bot_basic_id?: string | null } | null)?.bot_basic_id;
  return bot ? `https://line.me/R/ti/p/${bot}` : null;
}

async function sendPromotionEmail(
  admin: SupabaseClient,
  event: EventForPromotion,
  booking: { id: string; guest_name: string; guest_email: string },
  lineFriendUrl: string | null
): Promise<void> {
  const { subject, body } = buildBookingEmail({
    event,
    guestName: booking.guest_name,
    bookingId: booking.id,
    isWaitlisted: false,
    isPromotedFromWaitlist: true,
    lineFriendUrl,
  });
  try {
    await sendBatchEmails({
      to: [booking.guest_email],
      subject,
      html: wrapInHtml(body, event.title),
    });
    await admin.from("notifications").insert({
      recipient_email: booking.guest_email,
      type: "waitlist_promoted",
      subject,
      body,
    });
  } catch (err) {
    console.error("[waitlist-promotion] email error:", err);
  }
}
