import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushLineMessage } from "@/lib/line";
import { generateShortCode } from "@/lib/short-code";

// ─── Validation ──────────────────────────────────────────────

const createEventSchema = z.object({
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
  capacity_physical: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  capacity_online: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  price: z.coerce.number().int().min(0, "料金は0円以上にしてください"),
  image_url: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  teacher_name: z.string().optional().nullable(),
  teacher_bio: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  category_id: z.coerce.number().int().positive().optional().nullable(),
  tag_ids: z.array(z.coerce.number().int().positive()).optional(),
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
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "スラッグは小文字英数字とハイフンのみ使用できます")
    .optional(),
  is_published: z.boolean().optional().default(true),
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
    // If bank is in payment_methods, account number + holder must be filled
    if (data.payment_methods?.includes('bank')) {
      return !!(data.bank_account_number && data.bank_account_holder);
    }
    return true;
  },
  { message: "銀行振込を有効化する場合は口座番号と口座名義を入力してください", path: ["bank_account_number"] }
);

// Drafts only require a title — everything else is optional so the user can
// save a half-finished form and come back later. is_published is forced to false.
const draftEventSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(100, "タイトルは100文字以内で入力してください"),
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
  capacity_physical: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  capacity_online: z.coerce.number().int().min(0).max(10000).optional().nullable(),
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
  slug: z.string().optional(),
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

function generateSlug(title: string): string {
  const base = `event-${Date.now()}`;
  // try to create a readable slug from title (romanised approximation)
  return base;
}

// ─── POST /api/events ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
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

    const body = await request.json();
    const isDraft = body?.save_as_draft === true;

    if (isDraft) {
      const parsedDraft = draftEventSchema.safeParse(body);
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
      const slug = d.slug ?? generateSlug(d.title);
      const short_code = generateShortCode();
      // Datetime is NOT NULL in DB; use a far-future placeholder so the draft
      // doesn't accidentally appear as a past event before the user picks one.
      const placeholderDatetime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: draftEvent, error: draftErr } = await supabase
        .from("events")
        .insert({
          creator_id: user.id,
          title: d.title,
          description: d.description ?? "",
          datetime: d.datetime || placeholderDatetime,
          booking_deadline: d.booking_deadline || null,
          location: d.location || null,
          location_type: d.location_type ?? "physical",
          online_url: d.online_url || null,
          zoom_meeting_id: d.zoom_meeting_id || null,
          zoom_passcode: d.zoom_passcode || null,
          location_url: d.location_url || null,
          capacity: d.capacity ?? 0,
          capacity_physical: d.capacity_physical ?? null,
          capacity_online: d.capacity_online ?? null,
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
          slug,
          short_code,
          is_published: false,
        } as never)
        .select()
        .single();
      if (draftErr) {
        console.error("[POST /api/events draft] Supabase error:", draftErr);
        return NextResponse.json(
          { error: "下書きの保存に失敗しました" },
          { status: 500 }
        );
      }
      return NextResponse.json({ event: { ...draftEvent, booking_count: 0 } }, { status: 201 });
    }

    const parsed = createEventSchema.safeParse(body);
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
    const slug = data.slug ?? generateSlug(data.title);
    const short_code = generateShortCode();

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        creator_id: user.id,
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
        capacity_physical: data.capacity_physical ?? null,
        capacity_online: data.capacity_online ?? null,
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
        slug,
        short_code,
        is_published: data.is_published ?? true,
        category_id: data.category_id ?? null,
      } as never)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "このスラッグは既に使用されています。別のスラッグを指定してください。" },
          { status: 409 }
        );
      }
      console.error("[POST /api/events] Supabase error:", error);
      return NextResponse.json(
        { error: "イベントの作成に失敗しました" },
        { status: 500 }
      );
    }

    // Persist tag assignments via service role (RLS allows creator/co-admin/super-admin only)
    if (data.tag_ids && data.tag_ids.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        const eventRow = event as { id: string };
        const rows = data.tag_ids.map((tag_id) => ({
          event_id: eventRow.id,
          tag_id,
        }));
        await (admin.from as unknown as (t: string) => ReturnType<typeof admin.from>)(
          "event_tag_assignments"
        ).insert(rows);
      } catch (err) {
        console.error("[POST /api/events] tag insert error:", err);
        // do not fail the whole request — event was created
      }
    }

    // Notify creator via LINE (async, non-blocking)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      (async () => {
        try {
          const admin = createAdminClient();
          const { data: lineAccount } = await admin
            .from("line_accounts")
            .select("channel_access_token, is_active, owner_line_user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (lineAccount?.is_active && lineAccount.channel_access_token && lineAccount.owner_line_user_id) {
            const dateStr = formatDatetime(data.datetime);
            const priceStr = data.price === 0 ? "無料" : `¥${data.price.toLocaleString("ja-JP")}`;
            const message = `✅ イベントが作成されました\n\n📌 ${data.title}\n📅 ${dateStr}\n💰 ${priceStr}\n👥 定員${data.capacity}名`;

            await pushLineMessage(
              lineAccount.channel_access_token,
              lineAccount.owner_line_user_id,
              message
            );
          }
        } catch (err) {
          console.error("[POST /api/events] LINE notify to creator error:", err);
        }
      })();
    }

    // Augment with booking count (always 0 for new events)
    return NextResponse.json({ event: { ...event, booking_count: 0 } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/events] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// ─── GET /api/events ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const envError = checkEnvVars();
  if (envError) return envError;

  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const creatorId = searchParams.get("creator_id");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    let query = supabase
      .from("events")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("category", category);
    }
    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("[GET /api/events] Supabase error:", error);
      return NextResponse.json(
        { error: "イベントの取得に失敗しました" },
        { status: 500 }
      );
    }

    // Resolve confirmed booking counts in one admin query (RLS would otherwise
    // hide other people's bookings and return 0 to the public).
    const eventIds = (events ?? []).map((e) => (e as { id: string }).id);
    const countMap = new Map<string, number>();
    if (eventIds.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const { data: confirmedRows } = await admin
        .from("bookings")
        .select("event_id")
        .in("event_id", eventIds)
        .eq("status", "confirmed");
      for (const row of confirmedRows ?? []) {
        const eid = (row as { event_id: string }).event_id;
        countMap.set(eid, (countMap.get(eid) ?? 0) + 1);
      }
    }

    // Strip sensitive fields (zoom credentials, online URL, limited passcode) — these are
    // only revealed after booking via the thanks page / confirmation email.
    const normalised = (events ?? []).map((e) => {
      const count = countMap.get((e as { id: string }).id) ?? 0;
      const {
        limited_passcode: _lp,
        zoom_meeting_id: _zid,
        zoom_passcode: _zpc,
        online_url: _ou,
        bank_name: _bn,
        bank_branch: _bb,
        bank_account_type: _bat,
        bank_account_number: _ban,
        bank_account_holder: _bah,
        bank_note: _bnt,
        ...safe
      } = e as Record<string, unknown>;
      return { ...safe, booking_count: Number(count) };
    });

    return NextResponse.json({ events: normalised });
  } catch (err) {
    console.error("[GET /api/events] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
