import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushLineMessage, pushFlexMessage, buildMenuBookingNotifyText, buildMenuBookingConfirmationFlex } from "@/lib/line";
import { sendBatchEmails } from "@/lib/email";
import { wrapInHtml } from "@/lib/email-templates";
import type { CustomField } from "@/types/database";

// ─── Helpers ─────────────────────────────────────────────────

const baseBookingSchema = z.object({
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
    .regex(/^[\d\-\(\)\+\s]+$/, "有効な電話番号を入力してください")
    .optional()
    .or(z.literal("")),
  custom_field_values: z.record(z.string(), z.string()).optional().default({}),
});

function validateCustomFields(
  fields: CustomField[],
  values: Record<string, string>
): string | null {
  for (const field of fields) {
    const val = values[field.id];
    if (field.required && (!val || val.trim() === "")) {
      return `「${field.label}」は必須です`;
    }
    if (field.type === "select" && val && field.options && !field.options.includes(val)) {
      return `「${field.label}」の選択肢が不正です`;
    }
  }
  return null;
}

// ─── POST /api/menus/[id]/book ──────────────────────────────

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: menuId } = await props.params;
    const admin = createAdminClient();

    const body = await request.json();
    const parsed = baseBookingSchema.safeParse(body);
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

    // Fetch menu
    const { data: menu, error: menuError } = await admin
      .from("menus")
      .select("id, title, price, capacity, is_published, custom_fields, creator_id")
      .eq("id", menuId)
      .single();

    if (menuError || !menu) {
      return NextResponse.json({ error: "メニューが見つかりません" }, { status: 404 });
    }

    if (!menu.is_published) {
      return NextResponse.json({ error: "このメニューは現在受付中ではありません" }, { status: 410 });
    }

    // Validate custom fields
    const customFields = (menu.custom_fields ?? []) as unknown as CustomField[];
    const fieldError = validateCustomFields(customFields, data.custom_field_values);
    if (fieldError) {
      return NextResponse.json({ error: fieldError }, { status: 400 });
    }

    // Check capacity
    if (menu.capacity !== null) {
      const { count } = await admin
        .from("menu_bookings")
        .select("*", { count: "exact", head: true })
        .eq("menu_id", menuId)
        .eq("status", "confirmed");
      if ((count ?? 0) >= menu.capacity) {
        return NextResponse.json({ error: "このメニューは定員に達しています" }, { status: 409 });
      }
    }

    // Check duplicate email
    const { count: dupCount } = await admin
      .from("menu_bookings")
      .select("*", { count: "exact", head: true })
      .eq("menu_id", menuId)
      .eq("guest_email", data.guest_email)
      .eq("status", "confirmed");
    if ((dupCount ?? 0) > 0) {
      return NextResponse.json({ error: "このメールアドレスは既にお申し込み済みです" }, { status: 409 });
    }

    // Get optional user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Insert booking
    const { data: booking, error: insErr } = await admin
      .from("menu_bookings")
      .insert({
        menu_id: menuId,
        user_id: user?.id ?? null,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone || null,
        custom_field_values: data.custom_field_values,
        status: "confirmed",
      })
      .select()
      .single();

    if (insErr || !booking) {
      console.error("[POST /api/menus/[id]/book] Insert error:", insErr);
      return NextResponse.json({ error: "申し込みの登録に失敗しました" }, { status: 500 });
    }

    // Send confirmation email (async, non-blocking)
    const priceStr = menu.price === 0 ? "無料" : `¥${menu.price.toLocaleString("ja-JP")}`;
    const guestSubject = `【申し込み完了】${menu.title}`;
    const guestBody = `${data.guest_name} 様

${menu.title} へのお申し込みが完了しました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約番号：${booking.id}
■ メニュー：${menu.title}
■ 料金：${priceStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ご不明な点は主催者までお問い合わせください。

プチイベント作成くん`;

    admin
      .from("notifications")
      .insert({
        recipient_email: data.guest_email,
        type: "menu_booking_confirmation",
        subject: guestSubject,
        body: guestBody,
      })
      .then(({ error }) => {
        if (error) console.error("[menu-book] guest notification insert error:", error);
      });

    if (process.env.RESEND_API_KEY) {
      sendBatchEmails({
        to: [data.guest_email],
        subject: guestSubject,
        html: wrapInHtml(guestBody, menu.title),
      }).catch((err) => {
        console.error("[menu-book] Resend confirmation email error:", err);
      });
    }

    // Notify creator via email
    if (menu.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      (async () => {
        try {
          const admin = createAdminClient();
          const { data: creatorAuth } = await admin.auth.admin.getUserById(menu.creator_id);
          if (creatorAuth?.user?.email) {
            const creatorSubject = `【新規申し込み】${menu.title}`;
            const creatorBody = `${menu.title} に新しい申し込みがありました。\n申込者：${data.guest_name}（${data.guest_email}）`;
            await admin
              .from("notifications")
              .insert({
                recipient_email: creatorAuth.user.email,
                type: "new_menu_booking_alert",
                subject: creatorSubject,
                body: creatorBody,
              });

            if (process.env.RESEND_API_KEY) {
              await sendBatchEmails({
                to: [creatorAuth.user.email],
                subject: creatorSubject,
                html: wrapInHtml(creatorBody, menu.title),
              });
            }
          }
        } catch (err) {
          console.error("[menu-book] creator email notification error:", err);
        }
      })();
    }

    // Send LINE notification to creator (async, non-blocking)
    if (menu.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      (async () => {
        try {
          const adminClient = createAdminClient();
          const { data: lineAccount } = await adminClient
            .from("line_accounts")
            .select("id, channel_access_token, is_active, notify_on_booking, owner_line_user_id")
            .eq("user_id", menu.creator_id)
            .maybeSingle();

          if (lineAccount?.is_active && lineAccount.channel_access_token) {
            // Notify creator
            if (lineAccount.notify_on_booking) {
              const { count } = await adminClient
                .from("menu_bookings")
                .select("*", { count: "exact", head: true })
                .eq("menu_id", menuId)
                .eq("status", "confirmed");

              const message = buildMenuBookingNotifyText(
                menu.title,
                data.guest_name,
                count ?? 1,
                menu.capacity
              );

              if (lineAccount.owner_line_user_id) {
                await pushLineMessage(
                  lineAccount.channel_access_token,
                  lineAccount.owner_line_user_id,
                  message
                );
              }
            }

            // Send booking confirmation to attendee via LINE (if they have line_user_id)
            if (booking.user_id) {
              const { data: attendeeProfile } = await adminClient
                .from("profiles")
                .select("line_user_id")
                .eq("id", booking.user_id)
                .maybeSingle();

              if (attendeeProfile?.line_user_id) {
                const { data: follower } = await adminClient
                  .from("line_followers")
                  .select("id")
                  .eq("line_account_id", lineAccount.id)
                  .eq("line_user_id", attendeeProfile.line_user_id)
                  .eq("is_following", true)
                  .maybeSingle();

                if (follower) {
                  // Build custom field summary for the flex message
                  const customFields = (menu.custom_fields ?? []) as unknown as CustomField[];
                  const cfValues = data.custom_field_values;
                  let cfSummary: string | null = null;
                  if (customFields.length > 0 && Object.keys(cfValues).length > 0) {
                    const parts = customFields
                      .map((f) => {
                        const v = cfValues[f.id];
                        return v ? `${f.label}: ${v}` : null;
                      })
                      .filter(Boolean);
                    if (parts.length > 0) {
                      cfSummary = parts.join(" / ");
                      if (cfSummary.length > 100) cfSummary = cfSummary.slice(0, 97) + "…";
                    }
                  }

                  const confirmFlex = buildMenuBookingConfirmationFlex(
                    { ...menu, booking_count: 0 },
                    data.guest_name,
                    cfSummary,
                    process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app"
                  );
                  await pushFlexMessage(
                    lineAccount.channel_access_token,
                    attendeeProfile.line_user_id,
                    `✅ お申し込み完了: ${menu.title}`,
                    confirmFlex
                  );
                }
              }
            }
          }
        } catch (err) {
          console.error("[POST /api/menus/[id]/book] LINE notification error:", err);
        }
      })();
    }

    return NextResponse.json(
      {
        booking,
        redirect: `/menus/${menuId}/thanks?name=${encodeURIComponent(data.guest_name)}&email=${encodeURIComponent(data.guest_email)}`,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/menus/[id]/book] Unexpected error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
