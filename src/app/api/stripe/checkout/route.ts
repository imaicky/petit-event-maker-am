import { NextRequest, NextResponse } from "next/server";
import { getStripeForCreator } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calcApplicationFee,
  createConnectCheckoutSession,
} from "@/lib/stripe-connect";

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
      .select("id, title, price, image_url, creator_id, payment_method, payment_methods")
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

    // Allow Stripe checkout if 'stripe' is in the multi-method array OR the
    // legacy single field equals 'stripe'. Old events created before the
    // multi-method migration only have payment_method set.
    const evMethods = (event as Record<string, unknown>).payment_methods as string[] | null;
    const evSingle = (event as Record<string, unknown>).payment_method as string | null;
    const stripeAllowed =
      (Array.isArray(evMethods) && evMethods.includes("stripe")) ||
      (!evMethods && evSingle === "stripe");
    if (!stripeAllowed) {
      return NextResponse.json(
        { error: "This event does not use Stripe" },
        { status: 400 }
      );
    }

    // Look up creator's Stripe settings to determine Connect mode vs legacy.
    type SettingsRow = {
      connect_mode: "legacy" | "standard" | "express" | null;
      stripe_account_id: string | null;
      platform_fee_percent: number | null;
      platform_fee_fixed_jpy: number | null;
      charges_enabled: boolean | null;
    };
    let settings: SettingsRow | null = null;
    if (event.creator_id) {
      const { data } = await admin
        .from("stripe_settings")
        .select(
          "connect_mode, stripe_account_id, platform_fee_percent, platform_fee_fixed_jpy, charges_enabled"
        )
        .eq("user_id", event.creator_id)
        .maybeSingle();
      settings = (data as SettingsRow) ?? null;
    }

    // Connect (standard) mode requires charges_enabled to actually accept payment.
    const isConnect =
      settings?.connect_mode === "standard" || settings?.connect_mode === "express";

    if (isConnect) {
      if (!settings?.stripe_account_id) {
        return NextResponse.json(
          { error: "Stripe Connect アカウントが見つかりません" },
          { status: 503 }
        );
      }
      if (!settings.charges_enabled) {
        return NextResponse.json(
          {
            error:
              "Stripe Connect の登録が完了していません（charges_enabled=false）。Stripe側で必要な情報の入力を完了してください",
          },
          { status: 503 }
        );
      }
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
    // ticket_tier_id / amount_paid を見て、選択された tier の価格を使う。
    // マイグレーション未適用環境では当該カラムが無いので、まず欲張った
    // select を試し、失敗したら最低限のフィールドで再試行する。
    type BookingShape = {
      id: string;
      guest_name: string;
      guest_email: string;
      payment_status: string;
      stripe_session_id: string | null;
      ticket_tier_id?: string | null;
      amount_paid?: number | null;
    };
    let booking: BookingShape | null = null;
    let bookingErr: { code?: string; message?: string } | null = null;
    {
      const res = await admin
        .from("bookings")
        .select(
          "id, guest_name, guest_email, payment_status, stripe_session_id, ticket_tier_id, amount_paid"
        )
        .eq("id", booking_id)
        .single();
      booking = (res.data as unknown as BookingShape) ?? null;
      bookingErr = res.error;
      if (bookingErr) {
        const msg = (bookingErr.message || "").toLowerCase();
        const missingCol =
          bookingErr.code === "42703" ||
          bookingErr.code === "PGRST204" ||
          msg.includes("does not exist") ||
          msg.includes("column");
        if (missingCol) {
          const retry = await admin
            .from("bookings")
            .select(
              "id, guest_name, guest_email, payment_status, stripe_session_id"
            )
            .eq("id", booking_id)
            .single();
          booking = (retry.data as unknown as BookingShape) ?? null;
          bookingErr = retry.error;
        }
      }
    }

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

    const successUrl = `${baseUrl}/events/${event_id}/thanks?booking_id=${encodeURIComponent(booking_id)}&name=${encodeURIComponent(booking.guest_name)}&email=${encodeURIComponent(booking.guest_email)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/events/${event_id}?payment_cancelled=1`;

    // チケット種別が指定されていればその tier の price と name を使う。
    // event_ticket_tiers テーブルが未マイグレーションでも落ちないよう try/catch。
    let tierName: string | null = null;
    let tierAmount: number | null = null;
    if (booking.ticket_tier_id) {
      try {
        const { data: tier } = await admin
          .from("event_ticket_tiers")
          .select("name, price")
          .eq("id", booking.ticket_tier_id)
          .maybeSingle();
        if (tier) {
          const t = tier as { name: string; price: number };
          tierName = t.name;
          tierAmount = t.price;
        }
      } catch (err) {
        console.warn("[stripe/checkout] tier lookup failed (table missing?):", err);
      }
    }
    // 優先順位: tier の価格 > bookings.amount_paid > event.price
    const chargeAmount =
      tierAmount ??
      (typeof booking.amount_paid === "number" ? booking.amount_paid : null) ??
      event.price;
    const productName = tierName
      ? `${event.title}（${tierName}）`
      : event.title;

    let session;
    if (isConnect && settings?.stripe_account_id) {
      // Connect: Direct charge with application_fee_amount
      const feeJpy = calcApplicationFee(
        chargeAmount,
        Number(settings.platform_fee_percent ?? 5),
        Number(settings.platform_fee_fixed_jpy ?? 0)
      );
      session = await createConnectCheckoutSession({
        stripeAccountId: settings.stripe_account_id,
        amountJpy: chargeAmount,
        feeJpy,
        productName,
        productImageUrl: event.image_url ?? undefined,
        customerEmail: booking.guest_email,
        metadata: {
          booking_id,
          event_id,
          platform_fee_jpy: String(feeJpy),
          ticket_tier_id: booking.ticket_tier_id ?? "",
        },
        successUrl,
        cancelUrl,
        idempotencyKey: `checkout-${booking_id}`,
      });
    } else {
      // Legacy: Direct API on creator's own Stripe account (no fee)
      session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "jpy",
                product_data: {
                  name: productName,
                  ...(event.image_url ? { images: [event.image_url] } : {}),
                },
                unit_amount: chargeAmount,
              },
              quantity: 1,
            },
          ],
          customer_email: booking.guest_email,
          metadata: {
            booking_id,
            event_id,
            ticket_tier_id: booking.ticket_tier_id ?? "",
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        {
          idempotencyKey: `checkout-${booking_id}`,
        }
      );
    }

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
