import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { buildBookingEmail } from "@/lib/booking-email";

const schema = z.object({
  email: z.string().min(1).email("有効なメールアドレスを入力してください"),
});

// Always return the same success message regardless of whether a booking exists,
// so that this endpoint can't be used to probe for registered email addresses.
const GENERIC_SUCCESS = {
  ok: true,
  message: "登録されているメールアドレス宛に確認メールを再送しました。数分以内に届かない場合は迷惑メールフォルダもご確認ください。",
};

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラーです" }, { status: 500 });
  }

  try {
    const { id: eventId } = await props.params;
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "入力内容に誤りがあります",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const email = parsed.data.email.trim().toLowerCase();
    const admin = createAdminClient();

    const { data: booking } = await admin
      .from("bookings")
      .select("id, guest_name, guest_email, status")
      .eq("event_id", eventId)
      .eq("guest_email", email)
      .in("status", ["confirmed", "waitlisted"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!booking) {
      // Don't reveal whether the email is registered.
      return NextResponse.json(GENERIC_SUCCESS);
    }

    const { data: event } = await admin
      .from("events")
      .select("title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, location_url, price, creator_id, is_published")
      .eq("id", eventId)
      .single();

    if (!event || !(event as { is_published?: boolean }).is_published) {
      return NextResponse.json(GENERIC_SUCCESS);
    }

    // Look up creator's LINE bot for the friend-add URL (matches book route)
    let lineFriendUrl: string | null = null;
    const creatorId = (event as { creator_id: string | null }).creator_id;
    if (creatorId) {
      const { data: la } = await admin
        .from("line_accounts")
        .select("bot_basic_id")
        .eq("user_id", creatorId)
        .eq("is_active", true)
        .maybeSingle();
      if (la?.bot_basic_id) {
        lineFriendUrl = `https://line.me/R/ti/p/${la.bot_basic_id}`;
      }
    }

    const ev = event as {
      title: string;
      datetime: string;
      location: string | null;
      location_type: string | null;
      online_url: string | null;
      zoom_meeting_id: string | null;
      zoom_passcode: string | null;
      location_url: string | null;
      price: number;
    };
    const bk = booking as { id: string; guest_name: string; status: string };

    const { subject, body: emailBody } = buildBookingEmail({
      event: ev,
      guestName: bk.guest_name,
      bookingId: bk.id,
      isWaitlisted: bk.status === "waitlisted",
      lineFriendUrl,
    });
    const subjectWithResend = `【再送】${subject.replace(/^【再送】/, "")}`;

    if (process.env.RESEND_API_KEY) {
      await sendBatchEmails({
        to: [email],
        subject: subjectWithResend,
        html: wrapInHtml(emailBody, ev.title),
      }).catch((err) => {
        console.error("[POST /api/events/[id]/resend] Resend error:", err);
      });
    }

    // Audit trail in notifications table
    await admin
      .from("notifications")
      .insert({
        recipient_email: email,
        type: "booking_confirmation_resend",
        subject: subjectWithResend,
        body: emailBody,
      })
      .then(({ error }) => {
        if (error) console.error("[resend] notifications insert error:", error);
      });

    return NextResponse.json(GENERIC_SUCCESS);
  } catch (err) {
    console.error("[POST /api/events/[id]/resend] Unexpected error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
