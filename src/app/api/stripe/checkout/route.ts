import { NextRequest, NextResponse } from "next/server";
import { getStripeForCreator } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { booking_id, event_id } = await request.json();

    if (!booking_id || !event_id) {
      return NextResponse.json(
        { error: "booking_id and event_id are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Fetch event details (include creator_id for per-creator Stripe)
    const { data: event, error: eventErr } = await admin
      .from("events")
      .select("id, title, price, image_url, creator_id, payment_method")
      .eq("id", event_id)
      .single();

    if (eventErr || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (event.price <= 0) {
      return NextResponse.json(
        { error: "This event is free" },
        { status: 400 }
      );
    }

    if ((event as Record<string, unknown>).payment_method && (event as Record<string, unknown>).payment_method !== 'stripe') {
      return NextResponse.json(
        { error: "This event does not use Stripe" },
        { status: 400 }
      );
    }

    // Get Stripe instance for this creator (DB → env var fallback)
    const stripe = await getStripeForCreator(event.creator_id);
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      );
    }

    // Fetch booking details (include stripe_session_id for duplicate check)
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select("id, guest_name, guest_email, payment_status, stripe_session_id")
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // --- Duplicate payment prevention ---
    if (booking.payment_status === "paid") {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 409 }
      );
    }

    // If pending with an existing session, check if it's still open
    if (booking.payment_status === "pending" && booking.stripe_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          booking.stripe_session_id
        );
        if (existingSession.status === "open" && existingSession.url) {
          return NextResponse.json({ url: existingSession.url });
        }
        // Session expired or completed — fall through to create new one
      } catch {
        // Session retrieval failed — create a new one
      }
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "jpy",
              product_data: {
                name: event.title,
                ...(event.image_url ? { images: [event.image_url] } : {}),
              },
              unit_amount: event.price,
            },
            quantity: 1,
          },
        ],
        customer_email: booking.guest_email,
        metadata: {
          booking_id,
          event_id,
        },
        success_url: `${baseUrl}/events/${event_id}/thanks?name=${encodeURIComponent(booking.guest_name)}&email=${encodeURIComponent(booking.guest_email)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/events/${event_id}?payment_cancelled=1`,
      },
      {
        idempotencyKey: `checkout-${booking_id}`,
      }
    );

    // Update booking with stripe session id
    const { error: updateErr } = await admin
      .from("bookings")
      .update({
        stripe_session_id: session.id,
        payment_status: "pending",
      })
      .eq("id", booking_id);

    if (updateErr) {
      console.error("[POST /api/stripe/checkout] DB update error:", updateErr);
      // Non-fatal: session was created, user can still pay
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[POST /api/stripe/checkout] Error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
