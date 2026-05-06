import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";

// ─── Validation ──────────────────────────────────────────────

const updateEventSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  description: z.string().min(1, "説明を入力してください"),
  datetime: z.string().min(1, "日時を入力してください"),
  booking_deadline: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  location_type: z.enum(["physical", "online", "hybrid"]).optional().default("physical"),
  online_url: z.string().url("有効なURLを入力してください").optional().nullable(),
  zoom_meeting_id: z.string().max(50).optional().nullable(),
  zoom_passcode: z.string().max(50).optional().nullable(),
  location_url: z.string().url("有効なURLを入力してください").optional().nullable(),
  capacity: z.coerce
    .number()
    .int()
    .min(1, "定員は1名以上にしてください")
    .max(10000),
  price: z.coerce.number().int().min(0, "料金は0円以上にしてください"),
  image_url: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  teacher_name: z.string().optional().nullable(),
  teacher_bio: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  price_note: z.string().max(100).optional().nullable(),
  payment_method: z.enum(['stripe', 'bank', 'onsite', 'custom']).optional().default('stripe'),
  payment_methods: z.array(z.enum(['stripe', 'bank', 'onsite', 'custom'])).optional(),
  payment_link: z.string().url().optional().nullable(),
  payment_info: z.string().max(500).optional().nullable(),
  payment_deadline_days: z.coerce.number().int().min(1).max(60).optional().nullable(),
  bank_name: z.string().max(100).optional().nullable(),
  bank_branch: z.string().max(100).optional().nullable(),
  bank_account_type: z.string().max(20).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(100).optional().nullable(),
  bank_note: z.string().max(500).optional().nullable(),
  is_limited: z.boolean().optional().default(false),
  limited_passcode: z.string().max(50).optional().nullable(),
  is_published: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.location_type === "physical" || data.location_type === "hybrid") {
      return !!data.location;
    }
    return true;
  },
  { message: "場所を入力してください", path: ["location"] }
).refine(
  (data) => {
    if (data.payment_methods?.includes('bank')) {
      return !!(data.bank_account_number && data.bank_account_holder);
    }
    return true;
  },
  { message: "銀行振込を有効化する場合は口座番号と口座名義を入力してください", path: ["bank_account_number"] }
);

// Draft updates: only title required, everything else optional. Forces is_published=false.
const updateDraftSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(100),
  description: z.string().optional().nullable(),
  datetime: z.string().optional().nullable(),
  booking_deadline: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  location_type: z.enum(["physical", "online", "hybrid"]).optional().default("physical"),
  online_url: z.string().optional().nullable(),
  zoom_meeting_id: z.string().max(50).optional().nullable(),
  zoom_passcode: z.string().max(50).optional().nullable(),
  location_url: z.string().optional().nullable(),
  capacity: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  price: z.coerce.number().int().min(0).optional().default(0),
  image_url: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  teacher_name: z.string().optional().nullable(),
  teacher_bio: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  price_note: z.string().max(100).optional().nullable(),
  payment_method: z.enum(['stripe', 'bank', 'onsite', 'custom']).optional(),
  payment_methods: z.array(z.enum(['stripe', 'bank', 'onsite', 'custom'])).optional(),
  payment_link: z.string().optional().nullable(),
  payment_info: z.string().max(500).optional().nullable(),
  payment_deadline_days: z.coerce.number().int().min(1).max(60).optional().nullable(),
  bank_name: z.string().max(100).optional().nullable(),
  bank_branch: z.string().max(100).optional().nullable(),
  bank_account_type: z.string().max(20).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(100).optional().nullable(),
  bank_note: z.string().max(500).optional().nullable(),
  is_limited: z.boolean().optional().default(false),
  limited_passcode: z.string().max(50).optional().nullable(),
  save_as_draft: z.literal(true),
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

// ─── GET /api/events/[id] ────────────────────────────────────

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await props.params;
    const supabase = await createClient();

    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    // Count confirmed bookings via admin client. The bookings RLS only lets the
    // booker or the creator read rows, so a relational `bookings(count)` query
    // returns 0 for everyone else (including super-admins and the public),
    // which used to make full events look empty. Use the service role to read
    // a true count, and only count `confirmed` bookings — waitlisted and
    // cancelled rows must not consume capacity.
    let count = 0;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const { count: confirmedCount } = await admin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "confirmed");
      count = confirmedCount ?? 0;
    }

    // Fetch creator's LINE friend-add URL (bot_basic_id)
    let lineFriendUrl: string | null = null;
    if (event.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        const { data: lineAccount } = await admin
          .from("line_accounts")
          .select("bot_basic_id")
          .eq("user_id", event.creator_id)
          .eq("is_active", true)
          .maybeSingle();
        if (lineAccount?.bot_basic_id) {
          lineFriendUrl = `https://line.me/R/ti/p/${lineAccount.bot_basic_id}`;
        }
      } catch {
        // non-critical, skip
      }
    }

    // Check if current user has manage rights (creator, accepted co-admin, or super-admin)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const SUPER_ADMIN_EMAILS = ["imatoru@gmail.com"];
    const isCreator = user && (event as Record<string, unknown>).creator_id === user.id;
    const isSuperAdmin = !!user && SUPER_ADMIN_EMAILS.includes(user.email ?? "");
    let isCoAdmin = false;
    if (user && !isCreator && !isSuperAdmin) {
      const { data: adminRecord } = await supabase
        .from("event_admins")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();
      isCoAdmin = !!adminRecord;
    }
    const canManage = isCreator || isCoAdmin || isSuperAdmin;

    if (canManage) {
      // Managers see everything including limited_passcode and Zoom credentials
      return NextResponse.json({
        event: { ...event, booking_count: Number(count), line_friend_url: lineFriendUrl },
      });
    }

    // Block public access to draft (unpublished) events.
    if (!(event as Record<string, unknown>).is_published) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    // Hide sensitive fields from public response (shown only after booking).
    // Bank account info is also withheld until the participant has actually
    // booked — the thanks page re-fetches it via admin client.
    const {
      limited_passcode: _lp,
      zoom_meeting_id: _zid,
      zoom_passcode: _zpc,
      online_url: _ou,
      bank_name: _bn,
      bank_branch: _bb,
      bank_account_type: _bat,
      bank_account_number: bankAccountNumber,
      bank_account_holder: bankAccountHolder,
      bank_note: _bnt,
      ...safeEventBase
    } = event as Record<string, unknown>;
    // Strip 'bank' from public payment_methods if the event's bank info is
    // missing. Otherwise the booking form would offer "銀行振込" but the
    // booker would receive an email with no actual account number to pay to.
    const safeEvent = (() => {
      const arr = (safeEventBase as { payment_methods?: string[] | null }).payment_methods;
      if (!Array.isArray(arr)) return safeEventBase;
      const bankConfigured = !!(bankAccountNumber && bankAccountHolder);
      if (!bankConfigured && arr.includes("bank")) {
        return { ...safeEventBase, payment_methods: arr.filter((m) => m !== "bank") };
      }
      return safeEventBase;
    })();

    return NextResponse.json({
      event: { ...safeEvent, booking_count: Number(count), line_friend_url: lineFriendUrl },
    });
  } catch (err) {
    console.error("[GET /api/events/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/events/[id] ────────────────────────────────────

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await props.params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    // Check manage permission (creator or co-admin)
    const hasAccess = await canManageEvent(supabase, id, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "このイベントを編集する権限がありません" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const isDraft = body?.save_as_draft === true;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "サーバー設定エラーです" }, { status: 500 });
    }
    const admin = createAdminClient();

    let event: unknown;
    let error: { code?: string; message?: string } | null = null;

    if (isDraft) {
      const parsedDraft = updateDraftSchema.safeParse(body);
      if (!parsedDraft.success) {
        return NextResponse.json(
          {
            error: "入力内容に誤りがあります",
            details: parsedDraft.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }
      const d = parsedDraft.data;
      // Read existing datetime so we don't blank it on partial drafts
      const { data: existing } = await admin
        .from("events")
        .select("datetime")
        .eq("id", id)
        .single();
      const existingDatetime =
        existing && (existing as { datetime?: string }).datetime
          ? (existing as { datetime: string }).datetime
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const result = await admin
        .from("events")
        .update({
          title: d.title,
          description: d.description ?? "",
          datetime: d.datetime || existingDatetime,
          booking_deadline: d.booking_deadline || null,
          location: d.location || null,
          location_type: d.location_type ?? "physical",
          online_url: d.online_url || null,
          zoom_meeting_id: d.zoom_meeting_id || null,
          zoom_passcode: d.zoom_passcode || null,
          location_url: d.location_url || null,
          capacity: d.capacity ?? 0,
          price: d.price ?? 0,
          image_url: d.image_url || null,
          teacher_name: d.teacher_name || null,
          teacher_bio: d.teacher_bio || null,
          category: d.category || null,
          price_note: d.price_note || null,
          payment_method: null,
          payment_methods: d.payment_methods && d.payment_methods.length > 0 ? d.payment_methods : null,
          payment_link: null,
          payment_info: null,
          payment_deadline_days: d.payment_deadline_days ?? null,
          bank_name: d.bank_name || null,
          bank_branch: d.bank_branch || null,
          bank_account_type: d.bank_account_type || null,
          bank_account_number: d.bank_account_number || null,
          bank_account_holder: d.bank_account_holder || null,
          bank_note: d.bank_note || null,
          is_limited: d.is_limited ?? false,
          limited_passcode: d.is_limited ? (d.limited_passcode || null) : null,
          is_published: false,
        } as never)
        .eq("id", id)
        .select()
        .single();
      event = result.data;
      error = result.error;
    } else {
      const parsed = updateEventSchema.safeParse(body);
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

      const result = await admin
        .from("events")
        .update({
          title: data.title,
          description: data.description,
          datetime: data.datetime,
          booking_deadline: data.booking_deadline || null,
          location: data.location || null,
          location_type: data.location_type ?? "physical",
          online_url: data.online_url || null,
          zoom_meeting_id: data.zoom_meeting_id || null,
          zoom_passcode: data.zoom_passcode || null,
          location_url: data.location_url || null,
          capacity: data.capacity,
          price: data.price,
          image_url: data.image_url || null,
          teacher_name: data.teacher_name || null,
          teacher_bio: data.teacher_bio || null,
          category: data.category || null,
          price_note: data.price_note || null,
          payment_method: data.price > 0 ? (data.payment_method || 'stripe') : null,
          payment_methods: data.price > 0 && data.payment_methods && data.payment_methods.length > 0
            ? data.payment_methods
            : null,
          payment_link: data.price > 0 && (data.payment_methods?.includes('custom') || data.payment_method === 'custom')
            ? (data.payment_link || null)
            : null,
          payment_info: data.price > 0 && (data.payment_methods?.includes('custom') || data.payment_method === 'custom')
            ? (data.payment_info || null)
            : null,
          payment_deadline_days: data.payment_deadline_days ?? null,
          bank_name: data.payment_methods?.includes('bank') ? (data.bank_name || null) : null,
          bank_branch: data.payment_methods?.includes('bank') ? (data.bank_branch || null) : null,
          bank_account_type: data.payment_methods?.includes('bank') ? (data.bank_account_type || null) : null,
          bank_account_number: data.payment_methods?.includes('bank') ? (data.bank_account_number || null) : null,
          bank_account_holder: data.payment_methods?.includes('bank') ? (data.bank_account_holder || null) : null,
          bank_note: data.payment_methods?.includes('bank') ? (data.bank_note || null) : null,
          is_limited: data.is_limited ?? false,
          limited_passcode: data.is_limited ? (data.limited_passcode || null) : null,
          is_published: data.is_published,
        } as never)
        .eq("id", id)
        .select()
        .single();
      event = result.data;
      error = result.error;
    }

    if (error || !event) {
      console.error("[PUT /api/events/[id]] Supabase error:", error);
      return NextResponse.json(
        { error: `イベントの更新に失敗しました: ${error?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    // Get booking count
    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "confirmed");

    return NextResponse.json({ event: { ...event, booking_count: bookingCount ?? 0 } });
  } catch (err) {
    console.error("[PUT /api/events/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/events/[id] ─────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const { id } = await props.params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      );
    }

    // Fetch existing event to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("events")
      .select("id, creator_id")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    if (existing.creator_id !== user.id) {
      return NextResponse.json(
        { error: "このイベントを削除する権限がありません" },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("events").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/events/[id]] Supabase error:", error);
      return NextResponse.json(
        { error: "イベントの削除に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/events/[id]] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
