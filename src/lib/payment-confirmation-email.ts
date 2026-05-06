// Sends the "payment confirmed — here's your join info" email.
// Used by both the Stripe webhook (after Stripe confirms payment) and the
// manual bank-transfer confirm-payment endpoint, so the participant always
// gets the Zoom credentials at the same trust point.

import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { buildBookingEmail } from "@/lib/booking-email";
import { createAdminClient } from "@/lib/supabase/admin";

interface SendArgs {
  bookingId: string;
  /** "stripe" or "bank" — determines wording */
  source: "stripe" | "bank";
}

interface SendResult {
  ok: boolean;
  warning?: string;
}

const SOURCE_LABELS: Record<SendArgs["source"], { lead: string; subjectPrefix: string }> = {
  stripe: {
    lead: "決済が完了しました。ありがとうございます！\n以下が当日の参加情報です。",
    subjectPrefix: "【決済完了・参加情報】",
  },
  bank: {
    lead: "ご入金を確認いたしました。ありがとうございます！\n以下が当日の参加情報です。",
    subjectPrefix: "【入金確認・参加情報】",
  },
};

/**
 * Look up the booking and event, then send the post-payment confirmation email.
 * Idempotent: caller should guard against double-send (e.g. check
 * `payment_confirmation_emailed_at` if they care). This function does NOT
 * record that flag — it only sends.
 */
export async function sendPaymentConfirmationEmail(
  { bookingId, source }: SendArgs
): Promise<SendResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, warning: "no_service_role_key" };
  }
  const admin = createAdminClient();

  const { data: bk } = await admin
    .from("bookings")
    .select("id, event_id, guest_name, guest_email, status")
    .eq("id", bookingId)
    .single();
  if (!bk) return { ok: false, warning: "booking_not_found" };
  const booking = bk as {
    id: string;
    event_id: string;
    guest_name: string;
    guest_email: string;
    status: string;
  };
  if (booking.status === "cancelled") {
    return { ok: false, warning: "booking_cancelled" };
  }

  const { data: ev } = await admin
    .from("events")
    .select("title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, location_url, price, creator_id")
    .eq("id", booking.event_id)
    .single();
  if (!ev) return { ok: false, warning: "event_not_found" };
  const event = ev as {
    title: string;
    datetime: string;
    location: string | null;
    location_type: string | null;
    online_url: string | null;
    zoom_meeting_id: string | null;
    zoom_passcode: string | null;
    location_url: string | null;
    price: number;
    creator_id: string | null;
  };

  // Resolve creator's LINE friend URL for the email footer
  let lineFriendUrl: string | null = null;
  if (event.creator_id) {
    const { data: la } = await admin
      .from("line_accounts")
      .select("bot_basic_id")
      .eq("user_id", event.creator_id)
      .eq("is_active", true)
      .maybeSingle();
    if (la?.bot_basic_id) {
      lineFriendUrl = `https://line.me/R/ti/p/${la.bot_basic_id}`;
    }
  }

  const { body: detailsBody } = buildBookingEmail({
    event,
    guestName: booking.guest_name,
    bookingId: booking.id,
    isWaitlisted: false,
    lineFriendUrl,
  });
  // Drop the original "申込み完了しました" greeting; keep the details box onward.
  const detailsBoxIdx = detailsBody.indexOf("━");
  const detailsBlock = detailsBoxIdx >= 0 ? detailsBody.slice(detailsBoxIdx) : detailsBody;

  const labels = SOURCE_LABELS[source];
  const subject = `${labels.subjectPrefix}${event.title}`;
  const body = `${booking.guest_name} 様

${labels.lead}

${detailsBlock}`;

  if (process.env.RESEND_API_KEY && booking.guest_email) {
    try {
      await sendBatchEmails({
        to: [booking.guest_email],
        subject,
        html: wrapInHtml(body, event.title),
      });
    } catch (err) {
      console.error("[payment-confirmation-email] send error:", err);
      return { ok: false, warning: "send_failed" };
    }
  }

  await admin
    .from("notifications")
    .insert({
      recipient_email: booking.guest_email,
      type: "payment_confirmed",
      subject,
      body,
    })
    .then(({ error }) => {
      if (error) console.error("[payment-confirmation-email] notifications insert:", error);
    });

  return { ok: true };
}
