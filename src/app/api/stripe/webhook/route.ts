import { NextRequest, NextResponse } from "next/server";
import { getActiveWebhookSecrets } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const body = await request.text();

  // Get all active webhook secrets (DB + env var)
  const secrets = await getActiveWebhookSecrets();
  if (secrets.length === 0) {
    return NextResponse.json(
      { error: "No webhook secrets configured" },
      { status: 400 }
    );
  }

  // Try each secret to find the matching one
  let event: Stripe.Event | null = null;
  let matchedSecretKey: string | null = null;

  for (const { secret, secretKey } of secrets) {
    try {
      const stripe = new Stripe(secretKey);
      event = stripe.webhooks.constructEvent(body, sig, secret);
      matchedSecretKey = secretKey;
      break;
    } catch {
      // Try next secret
    }
  }

  if (!event || !matchedSecretKey) {
    console.error("[Stripe Webhook] No matching webhook secret found");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const stripe = new Stripe(matchedSecretKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;

        // Only mark as paid if Stripe confirms payment was received
        if (session.payment_status === "paid") {
          const { error } = await admin
            .from("bookings")
            .update({ payment_status: "paid" })
            .eq("id", bookingId);
          if (error) {
            console.error("[Stripe Webhook] DB update error (paid):", error);
          } else {
            console.log(`[Stripe Webhook] Booking ${bookingId} marked as paid`);
          }
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;

        const { error } = await admin
          .from("bookings")
          .update({ payment_status: "paid" })
          .eq("id", bookingId);
        if (error) {
          console.error("[Stripe Webhook] DB update error (async_paid):", error);
        } else {
          console.log(`[Stripe Webhook] Booking ${bookingId} async payment succeeded`);
        }
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;

        const { error } = await admin
          .from("bookings")
          .update({
            payment_status: "failed",
            status: "cancelled",
          })
          .eq("id", bookingId);
        if (error) {
          console.error("[Stripe Webhook] DB update error (async_failed):", error);
        } else {
          console.log(`[Stripe Webhook] Booking ${bookingId} async payment failed`);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;

        const { error } = await admin
          .from("bookings")
          .update({
            payment_status: "failed",
            status: "cancelled",
          })
          .eq("id", bookingId);
        if (error) {
          console.error("[Stripe Webhook] DB update error (expired):", error);
        } else {
          console.log(`[Stripe Webhook] Booking ${bookingId} session expired`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (!paymentIntentId) break;

        // Look up the checkout session by payment_intent to find booking_id
        try {
          const sessions = await stripe.checkout.sessions.list({
            payment_intent: paymentIntentId,
            limit: 1,
          });
          const session = sessions.data[0];
          const bookingId = session?.metadata?.booking_id;
          if (!bookingId) break;

          // Full refund: mark as refunded. Partial refund: keep as paid (log only)
          const isFullRefund = charge.amount_captured === charge.amount_refunded;
          if (isFullRefund) {
            const { error } = await admin
              .from("bookings")
              .update({ payment_status: "refunded" })
              .eq("id", bookingId);
            if (error) {
              console.error("[Stripe Webhook] DB update error (refunded):", error);
            } else {
              console.log(`[Stripe Webhook] Booking ${bookingId} fully refunded`);
            }
          } else {
            console.log(
              `[Stripe Webhook] Booking ${bookingId} partially refunded ` +
              `(${charge.amount_refunded}/${charge.amount_captured})`
            );
          }
        } catch (err) {
          console.error("[Stripe Webhook] Error processing refund:", err);
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
