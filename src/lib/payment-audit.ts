// Payment event audit logging.
// Append-only record of every payment status change, used so that financial
// disputes ("did I really pay?", "why was I auto-cancelled?") can be traced
// without relying on application logs alone.

import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentEventType =
  | "created" // booking created with payment_status = pending
  | "paid" // confirmed by Stripe webhook OR manual bank confirmation
  | "refunded"
  | "failed"
  | "cancelled" // user/organizer cancelled
  | "auto_cancelled" // cron auto-cancel after deadline
  | "reminder_sent" // bank-transfer payment reminder
  | "checkout_expired" // Stripe checkout session expired
  | "manual_confirmed"; // organizer pressed "入金確認" button

interface LogArgs {
  bookingId: string;
  eventId: string;
  type: PaymentEventType;
  prevStatus?: string | null;
  nextStatus?: string | null;
  paymentMethod?: string | null;
  amount?: number | null;
  actor?: string | null; // 'system' or user.id
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logPaymentEvent(args: LogArgs): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }
  try {
    const admin = createAdminClient();
    await admin.from("payment_events").insert({
      booking_id: args.bookingId,
      event_id: args.eventId,
      type: args.type,
      prev_status: args.prevStatus ?? null,
      next_status: args.nextStatus ?? null,
      payment_method: args.paymentMethod ?? null,
      amount: args.amount ?? null,
      actor: args.actor ?? "system",
      note: args.note ?? null,
      metadata: args.metadata ?? null,
    });
  } catch (err) {
    // Never let audit log failures break the actual flow
    console.error("[payment-audit] logPaymentEvent failed:", err);
  }
}
