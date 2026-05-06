import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";
import { sendPaymentConfirmationEmail } from "@/lib/payment-confirmation-email";
import { notifyOrganizerPayment } from "@/lib/organizer-payment-notification";
import { logPaymentEvent } from "@/lib/payment-audit";

// POST /api/events/[id]/bookings/[bookingId]/confirm-payment
// Marks a pending bank-transfer booking as paid and emails the participant
// the join info (Zoom credentials etc) that was withheld at booking time.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; bookingId: string }> }
) {
  const { id: eventId, bookingId } = await params;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "サーバー設定エラーです" }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const hasAccess = await canManageEvent(supabase, eventId, user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "このイベントへのアクセス権がありません" },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, event_id, guest_name, guest_email, status, payment_status, payment_method")
    .eq("id", bookingId)
    .single();
  if (!booking) {
    return NextResponse.json({ error: "予約が見つかりません" }, { status: 404 });
  }
  const bk = booking as {
    id: string;
    event_id: string;
    guest_name: string;
    guest_email: string;
    status: string;
    payment_status: string | null;
    payment_method: string | null;
  };
  if (bk.event_id !== eventId) {
    return NextResponse.json({ error: "予約がこのイベントに属していません" }, { status: 400 });
  }
  // Only bank-transfer bookings should be marked paid via this manual flow.
  // Stripe bookings flow through the Stripe webhook automatically.
  if (bk.payment_method !== "bank") {
    return NextResponse.json(
      { error: "この予約は手動入金確認の対象ではありません（銀行振込以外）" },
      { status: 400 }
    );
  }
  if (bk.payment_status === "paid") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }
  if (bk.status === "cancelled") {
    return NextResponse.json({ error: "キャンセル済みの予約です" }, { status: 400 });
  }

  // Update payment status
  const { error: updateErr } = await admin
    .from("bookings")
    .update({ payment_status: "paid" })
    .eq("id", bookingId);
  if (updateErr) {
    console.error("[confirm-payment] update error:", updateErr);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }

  // Audit log
  await logPaymentEvent({
    bookingId: bk.id,
    eventId,
    type: "manual_confirmed",
    prevStatus: bk.payment_status ?? "pending",
    nextStatus: "paid",
    paymentMethod: "bank",
    actor: user.id,
    note: "Organizer manually confirmed bank transfer payment",
  });

  // Send participant info email (with Zoom credentials) via shared helper
  const result = await sendPaymentConfirmationEmail({ bookingId: bk.id, source: "bank" });
  // Also notify the organizer (helps confirm the action took effect for them)
  await notifyOrganizerPayment({ bookingId: bk.id, source: "bank" });
  return NextResponse.json({ ok: true, emailSent: result.ok, warning: result.warning });
}
