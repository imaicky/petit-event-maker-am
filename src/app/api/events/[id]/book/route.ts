import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastLineMessage, pushLineMessage, pushFlexMessage, buildBookingNotifyText, buildBookingConfirmationFlex, buildWaitlistNotifyText, buildWaitlistConfirmationFlex } from "@/lib/line";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";

// ─── Validation ──────────────────────────────────────────────

const bookingSchema = z.object({
  guest_name: z
    .string()
    .min(1, "お名前を入力してください")
    .max(50, "お名前は50文字以内で入力してください"),
  guest_email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  guest_phone: z
    .string()
    .regex(
      /^[\d\-\(\)\+\s]+$/,
      "有効な電話番号を入力してください（例：090-1234-5678）"
    )
    .optional()
    .or(z.literal("")),
  passcode: z.string().optional(),
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

// ─── POST /api/events/[id]/book ──────────────────────────────

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id: eventId } = await props.params;
    const supabase = await createClient();

    // Parse request body
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "入力内容に誤りがあります",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check limited event passcode (body, then cookie)
    const { data: eventCheck } = await supabase
      .from("events")
      .select("is_limited, limited_passcode")
      .eq("id", eventId)
      .single();

    if (eventCheck?.is_limited && eventCheck.limited_passcode) {
      const bodyPasscode = data.passcode;
      const cookiePasscode = request.cookies.get(`event-pass-${eventId}`)?.value;
      const passcodeToCheck = bodyPasscode || cookiePasscode;

      if (!passcodeToCheck || passcodeToCheck !== eventCheck.limited_passcode) {
        return NextResponse.json(
          { error: "合言葉が正しくありません" },
          { status: 403 }
        );
      }
    }

    // Get optional logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Try atomic booking via RPC first, fall back to direct INSERT
    type BookingRow = {
      id: string;
      event_id: string;
      user_id: string | null;
      guest_name: string;
      guest_email: string;
      guest_phone: string | null;
      status: string;
      created_at: string;
    };

    let booking: BookingRow | null = null;

    // Use admin client directly for reliable booking (bypasses RLS issues with anonymous users)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[POST /api/events/[id]/book] SUPABASE_SERVICE_ROLE_KEY not set");
      return NextResponse.json({ error: "サーバー設定エラーです" }, { status: 500 });
    }

    const admin = createAdminClient();

    // 1. Fetch event
    const { data: ev, error: evErr } = await admin
      .from("events")
      .select("id, capacity, is_published, price, payment_method")
      .eq("id", eventId)
      .single();
    if (evErr || !ev) {
      console.error("[POST /api/events/[id]/book] Event fetch error:", evErr);
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }
    if (!ev.is_published) {
      return NextResponse.json({ error: "このイベントは現在受付中ではありません" }, { status: 410 });
    }

    // 2. Check capacity
    const { count } = await admin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "confirmed");
    const isFull = ev.capacity !== null && (count ?? 0) >= ev.capacity;

    // 3. Check duplicate (confirmed or waitlisted)
    const { count: dupCount } = await admin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("guest_email", data.guest_email)
      .in("status", ["confirmed", "waitlisted"]);
    if ((dupCount ?? 0) > 0) {
      return NextResponse.json({ error: "このメールアドレスは既にお申し込み済みです" }, { status: 409 });
    }

    // 4. Insert booking (waitlisted if full)
    const bookingStatus = isFull ? "waitlisted" : "confirmed";
    const isPaid = (ev.price ?? 0) > 0 && ((ev as Record<string, unknown>).payment_method ?? 'stripe') === 'stripe';
    const { data: inserted, error: insErr } = await admin
      .from("bookings")
      .insert({
        event_id: eventId,
        user_id: user?.id ?? null,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone || null,
        status: bookingStatus,
        payment_status: isPaid ? "pending" : "none",
      })
      .select()
      .single();

    if (insErr || !inserted) {
      console.error("[POST /api/events/[id]/book] Insert error:", insErr);
      return NextResponse.json({ error: "予約の登録に失敗しました" }, { status: 500 });
    }
    booking = inserted as BookingRow;

    // Fetch event details for notifications (use admin client for reliability)
    const { data: event } = await admin
      .from("events")
      .select("id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, location_url, capacity, price, creator_id, is_published")
      .eq("id", eventId)
      .single();

    // Fetch LINE account info early (used for email + LINE notification + API response)
    let lineFriendUrl: string | null = null;
    type LineAccountRow = {
      id: string;
      channel_access_token: string | null;
      is_active: boolean;
      notify_on_booking: boolean;
      owner_line_user_id: string | null;
      bot_basic_id: string | null;
    };
    let lineAccount: LineAccountRow | null = null;
    if (event?.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminForLine = createAdminClient();
      const { data: la } = await adminForLine
        .from("line_accounts")
        .select("id, channel_access_token, is_active, notify_on_booking, owner_line_user_id, bot_basic_id")
        .eq("user_id", event.creator_id)
        .maybeSingle();
      lineAccount = la as LineAccountRow | null;
      if (lineAccount?.bot_basic_id) {
        lineFriendUrl = `https://line.me/R/ti/p/${lineAccount.bot_basic_id}`;
      }
    }

    // Insert notifications (fire-and-forget – do not block the response)
    if (event) {
      const dateStr = formatDatetime(event.datetime);
      const priceStr =
        event.price === 0 ? "無料" : `¥${event.price.toLocaleString("ja-JP")}`;

      const locationType = (event as Record<string, unknown>).location_type as string | null;
      const onlineUrl = (event as Record<string, unknown>).online_url as string | null;
      const zoomMeetingId = (event as Record<string, unknown>).zoom_meeting_id as string | null;
      const zoomPasscode = (event as Record<string, unknown>).zoom_passcode as string | null;
      const locationUrl = (event as Record<string, unknown>).location_url as string | null;

      // Build online meeting info: Zoom ID/Passcode takes priority over online_url
      function buildOnlineLines(): string {
        if (zoomMeetingId) {
          let lines = `■ ZoomミーティングID：${zoomMeetingId}`;
          if (zoomPasscode) lines += `\n■ Zoomパスコード：${zoomPasscode}`;
          return lines;
        }
        if (onlineUrl) return `■ オンラインURL：${onlineUrl}`;
        return "■ オンライン（URLは後日お知らせします）";
      }

      let locationLines = `■ 場所：${event.location ?? "未定"}`;
      if (locationType === "online") {
        locationLines = buildOnlineLines();
      } else if (locationType === "hybrid") {
        locationLines = `■ 場所：${event.location ?? "未定"}`;
        if (locationUrl) locationLines += `\n■ 地図URL：${locationUrl}`;
        locationLines += `\n${buildOnlineLines()}`;
      } else {
        if (locationUrl) locationLines += `\n■ 地図URL：${locationUrl}`;
      }

      const isWaitlisted = bookingStatus === "waitlisted";
      const guestSubject = isWaitlisted
        ? `【キャンセル待ち登録完了】${event.title}`
        : `【申し込み完了】${event.title}`;

      const lineSection = lineFriendUrl
        ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 LINEで予約確認・リマインドを受け取る
以下のリンクから友だち追加してください：
${lineFriendUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        : "";

      const guestBody = isWaitlisted
        ? `${data.guest_name} 様

${event.title} のキャンセル待ちに登録されました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約番号：${booking.id}
■ イベント：${event.title}
■ 日時：${dateStr}
${locationLines}
■ 参加費：${priceStr}
■ ステータス：キャンセル待ち
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

空きが出た場合、自動的に予約が確定されメールでお知らせします。
${lineSection}
プチイベント作成くん`
        : `${data.guest_name} 様

${event.title} へのお申し込みが完了しました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約番号：${booking.id}
■ イベント：${event.title}
■ 日時：${dateStr}
${locationLines}
■ 参加費：${priceStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ご不明な点は主催者までお問い合わせください。
当日のご参加を心よりお待ちしております。
${lineSection}
プチイベント作成くん`;

      supabase
        .from("notifications")
        .insert({
          recipient_email: data.guest_email,
          type: isWaitlisted ? "waitlist_confirmation" : "booking_confirmation",
          subject: guestSubject,
          body: guestBody,
        })
        .then(({ error }) => {
          if (error) console.error("[book] guest notification insert error:", error);
        });

      // Send confirmation email via Resend (async, non-blocking)
      if (process.env.RESEND_API_KEY) {
        sendBatchEmails({
          to: [data.guest_email],
          subject: guestSubject,
          html: wrapInHtml(guestBody, event.title),
        }).catch((err) => {
          console.error("[book] Resend confirmation email error:", err);
        });
      }

      // Also notify the creator if they have an email (uses admin client to bypass RLS)
      if (event.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        (async () => {
          try {
            const adminForCreator = createAdminClient();
            const { data: creatorAuth } = await adminForCreator.auth.admin.getUserById(event.creator_id!);
            if (creatorAuth?.user?.email) {
              const creatorSubject = isWaitlisted
                ? `【キャンセル待ち登録】${event.title}`
                : `【新規申し込み】${event.title}`;
              const creatorBody = isWaitlisted
                ? `${event.title} にキャンセル待ちが追加されました。\n申込者：${data.guest_name}（${data.guest_email}）`
                : `${event.title} に新しい申し込みがありました。\n申込者：${data.guest_name}（${data.guest_email}）`;
              await adminForCreator
                .from("notifications")
                .insert({
                  recipient_email: creatorAuth.user.email,
                  type: isWaitlisted ? "waitlist_alert" : "new_booking_alert",
                  subject: creatorSubject,
                  body: creatorBody,
                });

              // Send email to creator via Resend
              if (process.env.RESEND_API_KEY) {
                await sendBatchEmails({
                  to: [creatorAuth.user.email],
                  subject: creatorSubject,
                  html: wrapInHtml(creatorBody, event.title),
                });
              }
            }
          } catch (err) {
            console.error("[book] creator email notification error:", err);
          }
        })();
      }
    }

    // Send LINE notification to creator (async, non-blocking)
    if (event?.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY && lineAccount) {
      const isWaitlisted = bookingStatus === "waitlisted";
      (async () => {
        try {
          const adminClient = createAdminClient();

          if (lineAccount?.is_active && lineAccount.channel_access_token) {
            // Notify creator
            if (lineAccount.notify_on_booking) {
              if (isWaitlisted) {
                // Get waitlist count
                const { count: wlCount } = await adminClient
                  .from("bookings")
                  .select("*", { count: "exact", head: true })
                  .eq("event_id", eventId)
                  .eq("status", "waitlisted");

                const message = buildWaitlistNotifyText(
                  event.title,
                  data.guest_name,
                  wlCount ?? 1
                );

                if (lineAccount.owner_line_user_id) {
                  await pushLineMessage(
                    lineAccount.channel_access_token,
                    lineAccount.owner_line_user_id,
                    message
                  );
                }
              } else {
                const { count: confirmedCount } = await adminClient
                  .from("bookings")
                  .select("*", { count: "exact", head: true })
                  .eq("event_id", eventId)
                  .eq("status", "confirmed");

                const message = buildBookingNotifyText(
                  event.title,
                  data.guest_name,
                  confirmedCount ?? 1,
                  event.capacity
                );

                if (lineAccount.owner_line_user_id) {
                  await pushLineMessage(
                    lineAccount.channel_access_token,
                    lineAccount.owner_line_user_id,
                    message
                  );
                }
              }
            }

            // Send LINE message to attendee (if they have line_user_id)
            if (booking.user_id) {
              const { data: attendeeProfile } = await adminClient
                .from("profiles")
                .select("line_user_id")
                .eq("id", booking.user_id)
                .maybeSingle();

              if (attendeeProfile?.line_user_id) {
                // Check the attendee is a follower of this bot
                const { data: follower } = await adminClient
                  .from("line_followers")
                  .select("id")
                  .eq("line_account_id", lineAccount.id)
                  .eq("line_user_id", attendeeProfile.line_user_id)
                  .eq("is_following", true)
                  .maybeSingle();

                if (follower) {
                  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app";
                  const flex = isWaitlisted
                    ? buildWaitlistConfirmationFlex(
                        { ...event, booking_count: 0 },
                        data.guest_name,
                        baseUrl
                      )
                    : buildBookingConfirmationFlex(
                        { ...event, booking_count: 0 },
                        data.guest_name,
                        baseUrl
                      );
                  const altText = isWaitlisted
                    ? `📋 キャンセル待ち登録: ${event.title}`
                    : `✅ 予約完了: ${event.title}`;
                  await pushFlexMessage(
                    lineAccount.channel_access_token,
                    attendeeProfile.line_user_id,
                    altText,
                    flex
                  );
                }
              }
            }
          }
        } catch (err) {
          console.error("[POST /api/events/[id]/book] LINE notification error:", err);
        }
      })();
    }

    const waitlistedParam = bookingStatus === "waitlisted" ? "&waitlisted=1" : "";
    return NextResponse.json(
      {
        booking,
        redirect: `/events/${eventId}/thanks?name=${encodeURIComponent(data.guest_name)}&email=${encodeURIComponent(data.guest_email)}${waitlistedParam}`,
        line_friend_url: lineFriendUrl,
        requires_payment: isPaid && !isFull,
        booking_id: booking.id,
        payment_method: (ev as Record<string, unknown>).payment_method ?? ((ev.price ?? 0) > 0 ? 'stripe' : null),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/events/[id]/book] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
