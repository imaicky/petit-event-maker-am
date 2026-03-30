import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastLineMessage, buildBookingNotifyText } from "@/lib/line";
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

    // Check limited event passcode
    const { data: eventCheck } = await supabase
      .from("events")
      .select("is_limited, limited_passcode")
      .eq("id", eventId)
      .single();

    if (eventCheck?.is_limited && eventCheck.limited_passcode) {
      if (!data.passcode || data.passcode !== eventCheck.limited_passcode) {
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

    const { data: rpcResult, error: rpcError } = await supabase.rpc("book_event", {
      p_event_id: eventId,
      p_user_id: user?.id ?? null,
      p_guest_name: data.guest_name,
      p_guest_email: data.guest_email,
      p_guest_phone: data.guest_phone || null,
    });

    if (rpcError) {
      const msg = rpcError.message ?? "";
      // Handle known business errors from the RPC function
      if (msg.includes("event_not_found")) {
        return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
      }
      if (msg.includes("event_not_published")) {
        return NextResponse.json({ error: "このイベントは現在受付中ではありません" }, { status: 410 });
      }
      if (msg.includes("capacity_exceeded")) {
        return NextResponse.json({ error: "このイベントは満員です" }, { status: 409 });
      }
      if (msg.includes("duplicate_booking")) {
        return NextResponse.json({ error: "このメールアドレスは既にお申し込み済みです" }, { status: 409 });
      }

      // RPC function may not exist — fall back to direct queries
      console.warn("[POST /api/events/[id]/book] RPC failed, using fallback:", rpcError.message);

      // 1. Fetch event
      const { data: ev, error: evErr } = await supabase
        .from("events")
        .select("id, capacity, is_published")
        .eq("id", eventId)
        .single();
      if (evErr || !ev) {
        return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
      }
      if (!ev.is_published) {
        return NextResponse.json({ error: "このイベントは現在受付中ではありません" }, { status: 410 });
      }

      // 2. Check capacity
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed");
      if (ev.capacity !== null && (count ?? 0) >= ev.capacity) {
        return NextResponse.json({ error: "このイベントは満員です" }, { status: 409 });
      }

      // 3. Check duplicate
      const { count: dupCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("guest_email", data.guest_email)
        .eq("status", "confirmed");
      if ((dupCount ?? 0) > 0) {
        return NextResponse.json({ error: "このメールアドレスは既にお申し込み済みです" }, { status: 409 });
      }

      // 4. Insert booking
      const { data: inserted, error: insErr } = await supabase
        .from("bookings")
        .insert({
          event_id: eventId,
          user_id: user?.id ?? null,
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          guest_phone: data.guest_phone || null,
          status: "confirmed",
        })
        .select()
        .single();

      if (insErr || !inserted) {
        console.error("[POST /api/events/[id]/book] Fallback insert error:", insErr);
        return NextResponse.json({ error: "予約の登録に失敗しました" }, { status: 500 });
      }
      booking = inserted as BookingRow;
    } else {
      booking = rpcResult as unknown as BookingRow;
    }

    if (!booking) {
      return NextResponse.json({ error: "予約の登録に失敗しました" }, { status: 500 });
    }

    // Fetch event details for notifications
    const { data: event } = await supabase
      .from("events")
      .select("id, title, datetime, location, capacity, price, creator_id, is_published")
      .eq("id", eventId)
      .single();

    // Insert notifications (fire-and-forget – do not block the response)
    if (event) {
      const dateStr = formatDatetime(event.datetime);
      const priceStr =
        event.price === 0 ? "無料" : `¥${event.price.toLocaleString("ja-JP")}`;

      const guestSubject = `【申し込み完了】${event.title}`;
      const guestBody = `${data.guest_name} 様

${event.title} へのお申し込みが完了しました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約番号：${booking.id}
■ イベント：${event.title}
■ 日時：${dateStr}
■ 場所：${event.location ?? "未定"}
■ 参加費：${priceStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ご不明な点は主催者までお問い合わせください。
当日のご参加を心よりお待ちしております。

プチイベント作成くん`;

      supabase
        .from("notifications")
        .insert({
          recipient_email: data.guest_email,
          type: "booking_confirmation",
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
            const admin = createAdminClient();
            const { data: creatorAuth } = await admin.auth.admin.getUserById(event.creator_id!);
            if (creatorAuth?.user?.email) {
              const creatorSubject = `【新規申し込み】${event.title}`;
              const creatorBody = `${event.title} に新しい申し込みがありました。\n申込者：${data.guest_name}（${data.guest_email}）`;
              await admin
                .from("notifications")
                .insert({
                  recipient_email: creatorAuth.user.email,
                  type: "new_booking_alert",
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
    if (event?.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      (async () => {
        try {
          const adminClient = createAdminClient();
          const { data: lineAccount } = await adminClient
            .from("line_accounts")
            .select("channel_access_token, is_active, notify_on_booking")
            .eq("user_id", event.creator_id!)
            .maybeSingle();

          if (lineAccount?.is_active && lineAccount.notify_on_booking && lineAccount.channel_access_token) {
            const { count } = await adminClient
              .from("bookings")
              .select("*", { count: "exact", head: true })
              .eq("event_id", eventId)
              .eq("status", "confirmed");

            const message = buildBookingNotifyText(
              event.title,
              data.guest_name,
              count ?? 1,
              event.capacity
            );
            await broadcastLineMessage(lineAccount.channel_access_token, message);
          }
        } catch (err) {
          console.error("[POST /api/events/[id]/book] LINE notification error:", err);
        }
      })();
    }

    return NextResponse.json(
      {
        booking,
        redirect: `/events/${eventId}/thanks?name=${encodeURIComponent(data.guest_name)}&email=${encodeURIComponent(data.guest_email)}`,
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
