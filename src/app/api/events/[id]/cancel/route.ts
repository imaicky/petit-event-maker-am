import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  pushLineMessage,
  pushFlexMessage,
  buildCancellationNotifyText,
  buildCancellationFlex,
  buildWaitlistPromotionNotifyText,
  buildWaitlistPromotionFlex,
} from "@/lib/line";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { getStripe } from "@/lib/stripe";

// ─── Validation ──────────────────────────────────────────────

const cancelSchema = z.object({
  booking_id: z.string().min(1, "予約IDが必要です"),
});

// ─── Helpers ─────────────────────────────────────────────────

function checkEnvVars(): NextResponse | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json(
      { error: "Supabase環境変数が設定されていません。.env.localを確認してください。" },
      { status: 503 }
    );
  }
  return null;
}

function formatDatetime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return iso;
  }
}

// ─── POST /api/events/[id]/cancel ────────────────────────────

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id: eventId } = await props.params;
    const supabase = await createClient();

    // Verify event exists (use admin for full access)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "サーバー設定エラーです" }, { status: 500 });
    }
    const admin = createAdminClient();

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, location_url, capacity, creator_id, price")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "booking_idが必要です" },
        { status: 400 }
      );
    }

    const { booking_id } = parsed.data;

    // Fetch the booking (use admin to avoid RLS issues)
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, event_id, user_id, guest_name, guest_email, status, payment_status, stripe_session_id")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 }
      );
    }

    if (booking.event_id !== eventId) {
      return NextResponse.json(
        { error: "予約がこのイベントに属していません" },
        { status: 400 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "この予約はすでにキャンセル済みです" },
        { status: 409 }
      );
    }

    const wasConfirmed = booking.status === "confirmed";

    // Update booking status
    const { error: updateError } = await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking_id);

    if (updateError) {
      console.error("[POST /api/events/[id]/cancel] Update error:", updateError);
      return NextResponse.json(
        { error: "キャンセルの処理に失敗しました" },
        { status: 500 }
      );
    }

    // ─── Stripe refund / session expiration ──────────────────────────────────────
    if (booking.stripe_session_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = getStripe();
        if (booking.payment_status === "paid") {
          // Retrieve payment_intent from the checkout session, then refund
          const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;

          if (paymentIntentId) {
            await stripe.refunds.create({ payment_intent: paymentIntentId });
            await admin
              .from("bookings")
              .update({ payment_status: "refunded" })
              .eq("id", booking_id);
            console.log(`[cancel] Refund issued for booking ${booking_id}`);
          }
        } else if (booking.payment_status === "pending") {
          // Expire the open checkout session so the user can't pay
          try {
            await stripe.checkout.sessions.expire(booking.stripe_session_id);
          } catch {
            // Session may already be expired — ignore
          }
          await admin
            .from("bookings")
            .update({ payment_status: "failed" })
            .eq("id", booking_id);
          console.log(`[cancel] Expired pending session for booking ${booking_id}`);
        }
      } catch (refundErr) {
        // Log but don't block cancellation
        console.error(`[cancel] Stripe refund/expire error for booking ${booking_id}:`, refundErr);
      }
    }

    // ─── Waitlist auto-promotion (only if a confirmed booking was cancelled) ────
    type PromotedBooking = {
      id: string;
      user_id: string | null;
      guest_name: string;
      guest_email: string;
    } | null;

    let promoted: PromotedBooking = null;

    if (wasConfirmed && event.capacity != null) {
      const { count: confirmedCount } = await admin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed");

      if ((confirmedCount ?? 0) < event.capacity) {
        // Get the oldest waitlisted booking (FIFO)
        const { data: nextInLine } = await admin
          .from("bookings")
          .select("id, user_id, guest_name, guest_email")
          .eq("event_id", eventId)
          .eq("status", "waitlisted")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextInLine) {
          const { error: promoteError } = await admin
            .from("bookings")
            .update({ status: "confirmed" })
            .eq("id", nextInLine.id)
            .eq("status", "waitlisted"); // guard against race

          if (!promoteError) {
            promoted = nextInLine;
          }
        }
      }
    }

    // ─── Notifications (fire-and-forget) ────────────────────────────────────────

    // 1. Guest cancellation email
    const dateStr = formatDatetime(event.datetime);
    const cancelSubject = `【キャンセル完了】${event.title}`;
    const cancelBody = `${booking.guest_name} 様

${event.title} のご予約をキャンセルしました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約番号：${booking.id}
■ イベント：${event.title}
■ 日時：${dateStr}
■ キャンセル日時：${formatDatetime(new Date().toISOString())}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

またのご利用をお待ちしております。

プチイベント作成くん`;

    supabase
      .from("notifications")
      .insert({
        recipient_email: booking.guest_email,
        type: "booking_cancellation",
        subject: cancelSubject,
        body: cancelBody,
      })
      .then(({ error }) => {
        if (error) console.error("[cancel] notification insert error:", error);
      });

    // Send cancellation email via Resend
    if (process.env.RESEND_API_KEY) {
      sendBatchEmails({
        to: [booking.guest_email],
        subject: cancelSubject,
        html: wrapInHtml(cancelBody, event.title),
      }).catch((err) => {
        console.error("[cancel] Resend cancel email error:", err);
      });
    }

    // 2. Creator email notification
    if (event.creator_id) {
      (async () => {
        try {
          const { data: creatorAuth } = await admin.auth.admin.getUserById(event.creator_id!);
          if (creatorAuth?.user?.email) {
            const { count: currentCount } = await admin
              .from("bookings")
              .select("*", { count: "exact", head: true })
              .eq("event_id", eventId)
              .eq("status", "confirmed");

            const creatorSubject = `【キャンセル通知】${event.title}`;
            const creatorBody = `${event.title} の予約がキャンセルされました。\n\nキャンセル者：${booking.guest_name}（${booking.guest_email}）\n現在の予約数：${currentCount ?? 0}名${event.capacity != null ? `／定員${event.capacity}名` : ""}`;

            await admin
              .from("notifications")
              .insert({
                recipient_email: creatorAuth.user.email,
                type: "booking_cancellation_alert",
                subject: creatorSubject,
                body: creatorBody,
              });

            if (process.env.RESEND_API_KEY) {
              await sendBatchEmails({
                to: [creatorAuth.user.email],
                subject: creatorSubject,
                html: wrapInHtml(creatorBody, event.title),
              });
            }
          }
        } catch (err) {
          console.error("[cancel] creator email error:", err);
        }
      })();
    }

    // 3. LINE notifications (creator + guest + promoted guest)
    if (event.creator_id) {
      (async () => {
        try {
          const { data: lineAccount } = await admin
            .from("line_accounts")
            .select("id, channel_access_token, is_active, notify_on_booking, owner_line_user_id")
            .eq("user_id", event.creator_id!)
            .maybeSingle();

          if (!lineAccount?.is_active || !lineAccount.channel_access_token) return;

          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app";

          // 3a. Creator DM: cancellation
          if (lineAccount.notify_on_booking && lineAccount.owner_line_user_id) {
            const { count: currentCount } = await admin
              .from("bookings")
              .select("*", { count: "exact", head: true })
              .eq("event_id", eventId)
              .eq("status", "confirmed");

            const cancelMsg = buildCancellationNotifyText(
              event.title,
              booking.guest_name,
              currentCount ?? 0,
              event.capacity
            );
            await pushLineMessage(
              lineAccount.channel_access_token,
              lineAccount.owner_line_user_id,
              cancelMsg
            );

            // 3b. Creator DM: promotion notification
            if (promoted) {
              const promoMsg = buildWaitlistPromotionNotifyText(
                event.title,
                promoted.guest_name,
                (currentCount ?? 0),
                event.capacity
              );
              await pushLineMessage(
                lineAccount.channel_access_token,
                lineAccount.owner_line_user_id,
                promoMsg
              );
            }
          }

          // 3c. Guest LINE: cancellation flex
          if (booking.user_id) {
            const { data: guestProfile } = await admin
              .from("profiles")
              .select("line_user_id")
              .eq("id", booking.user_id)
              .maybeSingle();

            if (guestProfile?.line_user_id) {
              const { data: follower } = await admin
                .from("line_followers")
                .select("id")
                .eq("line_account_id", lineAccount.id)
                .eq("line_user_id", guestProfile.line_user_id)
                .eq("is_following", true)
                .maybeSingle();

              if (follower) {
                const cancelFlex = buildCancellationFlex(
                  { ...event, booking_count: 0 },
                  booking.guest_name,
                  baseUrl
                );
                await pushFlexMessage(
                  lineAccount.channel_access_token,
                  guestProfile.line_user_id,
                  `❌ キャンセル完了: ${event.title}`,
                  cancelFlex
                );
              }
            }
          }

          // 3d. Promoted guest LINE: promotion flex
          if (promoted?.user_id) {
            const { data: promotedProfile } = await admin
              .from("profiles")
              .select("line_user_id")
              .eq("id", promoted.user_id)
              .maybeSingle();

            if (promotedProfile?.line_user_id) {
              const { data: follower } = await admin
                .from("line_followers")
                .select("id")
                .eq("line_account_id", lineAccount.id)
                .eq("line_user_id", promotedProfile.line_user_id)
                .eq("is_following", true)
                .maybeSingle();

              if (follower) {
                const promoFlex = buildWaitlistPromotionFlex(
                  { ...event, booking_count: 0 },
                  promoted.guest_name,
                  baseUrl
                );
                await pushFlexMessage(
                  lineAccount.channel_access_token,
                  promotedProfile.line_user_id,
                  `🎉 予約確定: ${event.title}`,
                  promoFlex
                );
              }
            }
          }
        } catch (err) {
          console.error("[cancel] LINE notification error:", err);
        }
      })();
    }

    // 4. Promoted guest email
    if (promoted) {
      (async () => {
        try {
          const promoSubject = `【予約確定】${event.title}（キャンセル待ちから繰り上がり）`;

          // Build location info for promoted guest email
          // Zoom ID/Passcode takes priority over online_url
          const evLocationType = (event as Record<string, unknown>).location_type as string | null;
          const evOnlineUrl = (event as Record<string, unknown>).online_url as string | null;
          const evZoomId = (event as Record<string, unknown>).zoom_meeting_id as string | null;
          const evZoomPass = (event as Record<string, unknown>).zoom_passcode as string | null;

          function buildPromoOnline(): string {
            if (evZoomId) {
              let lines = `■ ZoomミーティングID：${evZoomId}`;
              if (evZoomPass) lines += `\n■ Zoomパスコード：${evZoomPass}`;
              return lines;
            }
            if (evOnlineUrl) return `■ オンラインURL：${evOnlineUrl}`;
            return "■ オンライン（URLは後日お知らせします）";
          }

          let promoLocation = `■ 場所：${event.location ?? "未定"}`;
          if (evLocationType === "online") {
            promoLocation = buildPromoOnline();
          } else if (evLocationType === "hybrid") {
            promoLocation = `■ 場所：${event.location ?? "未定"}`;
            promoLocation += `\n${buildPromoOnline()}`;
          }

          const promoBody = `${promoted!.guest_name} 様

おめでとうございます！
${event.title} のキャンセル待ちから繰り上がり、予約が確定しました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ イベント：${event.title}
■ 日時：${dateStr}
${promoLocation}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

当日のご参加を心よりお待ちしております。

プチイベント作成くん`;

          await admin
            .from("notifications")
            .insert({
              recipient_email: promoted!.guest_email,
              type: "waitlist_promotion",
              subject: promoSubject,
              body: promoBody,
            });

          if (process.env.RESEND_API_KEY) {
            await sendBatchEmails({
              to: [promoted!.guest_email],
              subject: promoSubject,
              html: wrapInHtml(promoBody, event.title),
            });
          }
        } catch (err) {
          console.error("[cancel] promoted guest email error:", err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      booking_id,
      promoted: promoted ? { id: promoted.id, guest_name: promoted.guest_name } : null,
    });
  } catch (err) {
    console.error("[POST /api/events/[id]/cancel] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
