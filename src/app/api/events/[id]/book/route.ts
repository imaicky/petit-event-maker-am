import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastLineMessage, pushLineMessage, pushFlexMessage, multicastLineMessage, buildBookingNotifyText, buildBookingConfirmationFlex, buildWaitlistNotifyText, buildWaitlistConfirmationFlex } from "@/lib/line";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import { logPaymentEvent } from "@/lib/payment-audit";
import { recordInterestFromBooking } from "@/lib/user-interest";
import { parseCustomQuestions, sanitizeAnswers } from "@/lib/custom-questions";

// ─── Validation ──────────────────────────────────────────────

const bookingSchema = z.object({
  guest_name: z
    .string()
    .min(1, "お名前を入力してください")
    .max(50, "お名前は50文字以内で入力してください")
    .transform((s) => s.trim()),
  // Adversarial fix: 重複チェックの大文字小文字バイパスを防ぐため、
  // 入力段階で trim + lowercase に正規化する。
  guest_email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください")
    .transform((s) => s.trim().toLowerCase()),
  guest_phone: z
    .string()
    .regex(
      /^[\d\-\(\)\+\s]+$/,
      "有効な電話番号を入力してください（例：090-1234-5678）"
    )
    .optional()
    .or(z.literal("")),
  passcode: z.string().optional(),
  payment_method: z.enum(['stripe', 'bank', 'onsite', 'custom']).optional(),
  // hybrid イベントでは必須。非hybrid では無視（イベントの location_type から自動決定）。
  attendance_format: z.enum(["physical", "online"]).optional(),
  // イベントのカスタム質問への任意回答。サーバー側で sanitizeAnswers により
  // 質問定義に存在しない id や、selectの不正な値は破棄される。
  custom_answers: z.record(z.string(), z.string()).optional(),
});

// Default deadline rule: min(申込日 + 7日, 開催日 - 3日).
// Override with event.payment_deadline_days if provided.
function calculateBankDeadline(eventStart: string, deadlineDaysOverride: number | null | undefined): Date {
  const now = Date.now();
  const eventTs = new Date(eventStart).getTime();
  const days = deadlineDaysOverride && deadlineDaysOverride > 0 ? deadlineDaysOverride : 7;
  const fromBooking = now + days * 24 * 60 * 60 * 1000;
  const beforeEvent = eventTs - 3 * 24 * 60 * 60 * 1000;
  return new Date(Math.min(fromBooking, beforeEvent));
}

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
      .select("id, capacity, capacity_physical, capacity_online, location_type, is_published, price, payment_method, payment_methods, payment_deadline_days, booking_deadline, datetime, bank_account_number, bank_account_holder, payment_info, payment_link")
      .eq("id", eventId)
      .single();
    if (evErr || !ev) {
      console.error("[POST /api/events/[id]/book] Event fetch error:", evErr);
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }
    if (!ev.is_published) {
      return NextResponse.json({ error: "このイベントは現在受付中ではありません" }, { status: 410 });
    }
    // Booking deadline: explicit cutoff overrides event start time.
    const deadline = (ev as { booking_deadline?: string | null }).booking_deadline ?? null;
    const eventStart = (ev as { datetime?: string }).datetime ?? null;
    const now = Date.now();
    if (deadline && now > new Date(deadline).getTime()) {
      return NextResponse.json(
        { error: "申し込み締め切りを過ぎています" },
        { status: 410 }
      );
    }
    if (!deadline && eventStart && now > new Date(eventStart).getTime()) {
      return NextResponse.json(
        { error: "このイベントは既に終了しています" },
        { status: 410 }
      );
    }

    // 1b. カスタム質問への任意回答を、現在の質問定義に対して正規化。
    // 未定義の id・選択肢外の値・空文字は捨てる。
    // custom_questions は DB types 未再生成のため untyped クライアントで取得。
    let eventQuestions: ReturnType<typeof parseCustomQuestions> = [];
    try {
      const { data: cqRow } = await (
        admin.from as unknown as (t: string) => ReturnType<typeof admin.from>
      )("events")
        .select("custom_questions")
        .eq("id", eventId)
        .maybeSingle();
      const raw = (cqRow as { custom_questions?: unknown } | null)?.custom_questions;
      eventQuestions = parseCustomQuestions(raw);
    } catch {
      eventQuestions = [];
    }
    const sanitizedCustomAnswers = sanitizeAnswers(
      eventQuestions,
      data.custom_answers ?? {}
    );

    // 2. 参加形式の決定 (hybrid のときだけユーザー入力必須)
    const evLocType = (ev as { location_type?: string | null }).location_type ?? "physical";
    const isHybridEvent = evLocType === "hybrid";
    let effectiveFormat: "physical" | "online";
    if (isHybridEvent) {
      if (!data.attendance_format) {
        return NextResponse.json(
          { error: "参加形式（リアル / オンライン）を選んでください" },
          { status: 400 }
        );
      }
      effectiveFormat = data.attendance_format;
    } else {
      effectiveFormat = evLocType === "online" ? "online" : "physical";
    }

    // 2b. Check capacity
    // hybrid: 形式別 capacity を見る / 非hybrid: 全体 capacity
    let count: number | null = null;
    let isFull = false;
    if (isHybridEvent) {
      const formatCapacity =
        effectiveFormat === "physical"
          ? (ev as { capacity_physical?: number | null }).capacity_physical
          : (ev as { capacity_online?: number | null }).capacity_online;
      if (formatCapacity == null) {
        return NextResponse.json(
          {
            error: `${
              effectiveFormat === "physical" ? "リアル参加" : "オンライン参加"
            }の定員が設定されていないため受け付けられません。主催者にお問い合わせください。`,
          },
          { status: 503 }
        );
      }
      const fmtQ = await admin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed")
        .eq("attendance_format", effectiveFormat);
      count = fmtQ.count ?? 0;
      isFull = count >= formatCapacity;
    } else {
      const q = await admin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "confirmed");
      count = q.count ?? 0;
      isFull = ev.capacity !== null && count >= ev.capacity;
    }

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

    // 4. Determine effective payment method for this booking.
    // Filter out methods whose required event-level fields aren't populated
    // (e.g. event has 'bank' enabled but no account info — booker would get
    // a useless email with "—" everywhere).
    type PM = 'stripe' | 'bank' | 'onsite' | 'custom';
    const evFull = ev as Record<string, unknown>;
    const isMethodConfigured = (m: PM): boolean => {
      if (m === 'bank') {
        return !!(evFull.bank_account_number && evFull.bank_account_holder);
      }
      // stripe — assume creator has Stripe set up; checkout endpoint will error
      // gracefully if not. onsite/custom always allowed (custom info optional).
      return true;
    };
    const rawAllowed: PM[] = (() => {
      const arr = (ev as Record<string, unknown>).payment_methods as string[] | null;
      if (Array.isArray(arr) && arr.length > 0) return arr.filter((m): m is PM => ['stripe','bank','onsite','custom'].includes(m));
      const single = (ev as Record<string, unknown>).payment_method as string | null;
      return single ? [single as PM] : [];
    })();
    const allowedMethods: PM[] = rawAllowed.filter(isMethodConfigured);

    let chosenMethod: PM | null = null;
    if ((ev.price ?? 0) > 0) {
      if (data.payment_method && allowedMethods.includes(data.payment_method as PM)) {
        chosenMethod = data.payment_method as PM;
      } else if (allowedMethods.length === 1) {
        chosenMethod = allowedMethods[0];
      } else if (rawAllowed.length === 0) {
        // Truly legacy event with no payment_methods array — fall back to Stripe.
        chosenMethod = 'stripe';
      } else if (allowedMethods.length === 0) {
        // Event has methods configured at the array level but none are
        // actually usable (e.g. only 'bank' enabled but bank info empty).
        return NextResponse.json(
          {
            error: "決済方法の設定が不完全です。主催者にお問い合わせください。",
          },
          { status: 503 }
        );
      } else {
        return NextResponse.json(
          { error: "決済方法を選択してください" },
          { status: 400 }
        );
      }
    }

    // 5. Insert booking (waitlisted if full)
    let bookingStatus: "waitlisted" | "confirmed" = isFull
      ? "waitlisted"
      : "confirmed";
    const isPaid = chosenMethod === 'stripe';
    const isPendingBank = chosenMethod === 'bank' && bookingStatus === "confirmed";
    let paymentStatus: "pending" | "paid" | "none" | "refunded" | "failed" = "none";
    if (isPaid) paymentStatus = "pending"; // Stripe — becomes 'paid' after checkout
    else if (isPendingBank) paymentStatus = "pending"; // bank — becomes 'paid' after manual confirm

    const paymentDeadline = isPendingBank
      ? calculateBankDeadline(
          (ev as { datetime: string }).datetime,
          (ev as { payment_deadline_days?: number | null }).payment_deadline_days ?? null
        ).toISOString()
      : null;

    const { data: inserted, error: insErr } = await admin
      .from("bookings")
      .insert({
        event_id: eventId,
        user_id: user?.id ?? null,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone || null,
        status: bookingStatus,
        attendance_format: effectiveFormat,
        payment_status: paymentStatus,
        payment_method: chosenMethod,
        payment_deadline: paymentDeadline,
        custom_answers: sanitizedCustomAnswers,
      })
      .select()
      .single();

    if (insErr || !inserted) {
      console.error("[POST /api/events/[id]/book] Insert error:", insErr);
      return NextResponse.json({ error: "予約の登録に失敗しました" }, { status: 500 });
    }
    booking = inserted as BookingRow;

    // ─── Adversarial defense: post-insert capacity verification ──
    // 同時アクセスで定員を超えてしまった場合、後から確認して
    // 必要なら waitlisted にデモートする。
    // hybrid のときは形式別 capacity で判定する。
    {
      let formatCapacityForCheck: number | null = null;
      if (isHybridEvent) {
        formatCapacityForCheck =
          effectiveFormat === "physical"
            ? ((ev as { capacity_physical?: number | null }).capacity_physical ?? null)
            : ((ev as { capacity_online?: number | null }).capacity_online ?? null);
      } else if (typeof ev.capacity === "number") {
        formatCapacityForCheck = ev.capacity;
      }

      if (
        bookingStatus === "confirmed" &&
        formatCapacityForCheck !== null
      ) {
        const postQ = admin
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("event_id", eventId)
          .eq("status", "confirmed");
        if (isHybridEvent) postQ.eq("attendance_format", effectiveFormat);
        const { count: postCount } = await postQ;
        if ((postCount ?? 0) > formatCapacityForCheck) {
          const latestQ = admin
            .from("bookings")
            .select("id, created_at")
            .eq("event_id", eventId)
            .eq("status", "confirmed")
            .order("created_at", { ascending: false })
            .limit(1);
          if (isHybridEvent) latestQ.eq("attendance_format", effectiveFormat);
          const { data: latest } = await latestQ.maybeSingle();
          if (latest && (latest as { id: string }).id === booking.id) {
            await admin
              .from("bookings")
              .update({ status: "waitlisted" })
              .eq("id", booking.id);
            booking = { ...booking, status: "waitlisted" } as BookingRow;
            bookingStatus = "waitlisted";
            console.warn(
              "[book] race condition detected: demoted to waitlisted",
              booking.id
            );
          }
        }
      }
    }

    // Audit log: booking created (with payment expectations if any)
    if (chosenMethod) {
      await logPaymentEvent({
        bookingId: booking.id,
        eventId,
        type: "created",
        nextStatus: paymentStatus,
        paymentMethod: chosenMethod,
        amount: ev.price ?? null,
        actor: user?.id ?? "guest",
        metadata: { booking_status: bookingStatus, payment_deadline: paymentDeadline },
      });
    }

    // F3-02 興味プロファイル: confirmed bookingの場合のみタグスコアを加算。
    // waitlisted は実際に行く確証がないので skip。
    if (bookingStatus === "confirmed" && user?.id) {
      recordInterestFromBooking(user.id, eventId).catch((e) => {
        console.warn(
          "[book] recordInterestFromBooking failed:",
          e instanceof Error ? e.message : String(e)
        );
      });
    }

    // Fetch event details for notifications (use admin client for reliability)
    const { data: event } = await admin
      .from("events")
      .select("id, title, datetime, location, location_type, online_url, zoom_meeting_id, zoom_passcode, location_url, capacity, price, creator_id, is_published, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder, bank_note")
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
      notify_line_user_ids: string[] | null;
      bot_basic_id: string | null;
    };
    let lineAccount: LineAccountRow | null = null;
    if (event?.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminForLine = createAdminClient();
      const { data: la } = await adminForLine
        .from("line_accounts")
        .select("id, channel_access_token, is_active, notify_on_booking, owner_line_user_id, notify_line_user_ids, bot_basic_id")
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

      // Build online meeting info: Zoom ID/Passcode takes priority over online_url.
      // When the booking is bank-transfer pending, withhold Zoom credentials —
      // they're sent after the organiser confirms payment.
      function buildOnlineLines(): string {
        if (chosenMethod === 'bank') {
          return "■ オンライン参加情報：入金確認後にメールでお知らせします";
        }
        if (zoomMeetingId) {
          let lines = `■ ZoomミーティングID：${zoomMeetingId}`;
          if (zoomPasscode) lines += `\n■ Zoomパスコード：${zoomPasscode}`;
          return lines;
        }
        if (onlineUrl) return `■ オンラインURL：${onlineUrl}`;
        return "■ オンライン（URLは後日お知らせします）";
      }

      // Bank transfer instructions for the email body
      const bankSection = chosenMethod === 'bank' && paymentDeadline
        ? (() => {
            const ev2 = event as Record<string, unknown>;
            const lines = [
              "",
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
              "💴 お振込みのお願い",
              `■ 振込先銀行：${ev2.bank_name ?? "—"}`,
              `■ 支店：${ev2.bank_branch ?? "—"}`,
              `■ 口座種別：${ev2.bank_account_type ?? "普通"}`,
              `■ 口座番号：${ev2.bank_account_number ?? "—"}`,
              `■ 口座名義：${ev2.bank_account_holder ?? "—"}`,
              `■ 振込金額：${priceStr}`,
              `■ 振込期限：${formatDatetime(paymentDeadline)} まで`,
              ev2.bank_note ? `■ 注意事項：${ev2.bank_note}` : null,
              "※ 入金確認後、参加情報（オンライン参加URLなど）をメールでお送りします",
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            ].filter((s): s is string => s !== null);
            return lines.join("\n");
          })()
        : "";

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
${locationLines}${isHybridEvent ? `\n■ 参加形式：${effectiveFormat === "physical" ? "リアル参加（会場）" : "オンライン参加"}` : ""}
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
${locationLines}${isHybridEvent ? `\n■ 参加形式：${effectiveFormat === "physical" ? "リアル参加（会場）" : "オンライン参加"}` : ""}
■ 参加費：${priceStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${bankSection}
ご不明な点は主催者までお問い合わせください。
当日のご参加を心よりお待ちしております。
${lineSection}
プチイベント作成くん`;

      // For Stripe-confirmed bookings, skip the immediate email — the user is
      // about to be redirected to checkout. The Stripe webhook sends the
      // participant info email after payment is actually confirmed, so the
      // Zoom credentials never go out before the money does.
      // Waitlisted Stripe bookings still get an email (no payment redirect).
      const skipImmediateEmail =
        chosenMethod === "stripe" && bookingStatus === "confirmed";

      if (!skipImmediateEmail) {
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

        if (process.env.RESEND_API_KEY) {
          sendBatchEmails({
            to: [data.guest_email],
            subject: guestSubject,
            html: wrapInHtml(guestBody, event.title),
          }).catch((err) => {
            console.error("[book] Resend confirmation email error:", err);
          });
        }
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

                // Notify ALL registered admin LINE user IDs (multicast),
                // falling back to owner if the array is empty.
                const recipients = (
                  lineAccount.notify_line_user_ids?.length
                    ? lineAccount.notify_line_user_ids
                    : lineAccount.owner_line_user_id
                    ? [lineAccount.owner_line_user_id]
                    : []
                );
                if (recipients.length === 1) {
                  await pushLineMessage(
                    lineAccount.channel_access_token,
                    recipients[0],
                    message
                  );
                } else if (recipients.length > 1) {
                  await multicastLineMessage(
                    lineAccount.channel_access_token,
                    recipients,
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

                const recipients = (
                  lineAccount.notify_line_user_ids?.length
                    ? lineAccount.notify_line_user_ids
                    : lineAccount.owner_line_user_id
                    ? [lineAccount.owner_line_user_id]
                    : []
                );
                if (recipients.length === 1) {
                  await pushLineMessage(
                    lineAccount.channel_access_token,
                    recipients[0],
                    message
                  );
                } else if (recipients.length > 1) {
                  await multicastLineMessage(
                    lineAccount.channel_access_token,
                    recipients,
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
        redirect: `/events/${eventId}/thanks?booking_id=${encodeURIComponent(booking.id)}&name=${encodeURIComponent(data.guest_name)}&email=${encodeURIComponent(data.guest_email)}${waitlistedParam}`,
        line_friend_url: lineFriendUrl,
        // Only Stripe needs an immediate redirect to a checkout flow
        requires_payment: isPaid && !isFull,
        booking_id: booking.id,
        payment_method: chosenMethod,
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
