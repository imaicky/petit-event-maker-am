/**
 * リマインダー送信ロジック（Phase B）
 *
 * イベントごとに reminder_schedule（複数オフセット）を持ち、各オフセットごとに
 * メール + LINE で参加者にリマインドを送る。
 *
 * - 送信実績は event_reminder_sends に記録し、二重送信を防ぐ
 * - 申込者本人がLINE紐付け済み（bookings.line_user_id 有）の場合は LINE push
 * - そうでなくても、主催者の line_accounts が active なら multicast でフォロワーに送る
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBatchEmails } from "@/lib/email";
import { buildReminderEmailHtml } from "@/lib/email-templates";
import {
  buildReminderFlexBubble,
  multicastFlexMessage,
  pushFlexMessage,
} from "@/lib/line";

// 既定のリマインダースケジュール（reminder_schedule が NULL のときに使う）
export const DEFAULT_REMINDER_OFFSETS: number[] = [24, 3];

// 主催者がプリセットで選びやすいよう公開している候補
export const REMINDER_PRESETS: Array<{ offset_hours: number; label: string }> = [
  { offset_hours: 168, label: "1週間前" },
  { offset_hours: 72, label: "3日前" },
  { offset_hours: 48, label: "2日前" },
  { offset_hours: 24, label: "1日前（推奨）" },
  { offset_hours: 6, label: "6時間前" },
  { offset_hours: 3, label: "当日（3時間前）" },
];

export type ReminderScheduleEntry = { offset_hours: number };

export function parseReminderSchedule(raw: unknown): ReminderScheduleEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ReminderScheduleEntry[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && "offset_hours" in item) {
      const v = (item as { offset_hours: unknown }).offset_hours;
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        out.push({ offset_hours: Math.floor(v) });
      }
    }
  }
  // 同一オフセットを重複排除
  const seen = new Set<number>();
  return out.filter((e) => {
    if (seen.has(e.offset_hours)) return false;
    seen.add(e.offset_hours);
    return true;
  });
}

type EventLite = {
  id: string;
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  online_url: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  price: number;
  capacity: number | null;
  image_url: string | null;
  short_code: string | null;
  creator_id: string | null;
  reminder_schedule?: unknown;
};

type SendOpts = {
  baseUrl: string;
  /** 「明日開催」など人間向けの相対表現 */
  timeLabel: string;
};

/**
 * 単一の (event, offset_hours) について、メール + LINE でリマインドを送る。
 * すでに event_reminder_sends に行があれば skip。
 *
 * @returns 送信した人数（参考値）。skip 時は -1
 */
export async function sendReminderForOffset(
  admin: ReturnType<typeof createAdminClient>,
  event: EventLite,
  offsetHours: number,
  opts: SendOpts
): Promise<number> {
  // すでに送信済みかチェック（unique 制約に頼らず明示的に確認）
  const { data: existing } = await admin
    .from("event_reminder_sends")
    .select("id")
    .eq("event_id", event.id)
    .eq("offset_hours", offsetHours)
    .maybeSingle();
  if (existing) return -1;

  // 確定参加者を取得（line_user_id も含めて1回で）
  const { data: bookings } = await admin
    .from("bookings")
    .select("guest_email, guest_name, user_id, line_user_id")
    .eq("event_id", event.id)
    .eq("status", "confirmed");

  if (!bookings || bookings.length === 0) {
    // 参加者がいなくても「送信ログ」だけは記録して再走を防ぐ
    await admin.from("event_reminder_sends").insert({
      event_id: event.id,
      offset_hours: offsetHours,
      recipient_count: 0,
      channel: "email",
    } as never);
    return 0;
  }

  const bookingRows = bookings as Array<{
    guest_email: string | null;
    guest_name: string | null;
    user_id: string | null;
    line_user_id?: string | null;
  }>;

  const dateStr = new Date(event.datetime).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ─── メール送信 ────────────────────────────────────────
  const emails: string[] = [
    ...new Set(
      bookingRows
        .map((b) => b.guest_email)
        .filter((e): e is string => !!e && e.includes("@"))
    ),
  ];
  const subject = `【${opts.timeLabel}】${event.title}`;
  const html = buildReminderEmailHtml(
    event.title,
    dateStr,
    event.location ?? "未定",
    opts.timeLabel,
    {
      locationType: event.location_type,
      onlineUrl: event.online_url,
      zoomMeetingId: event.zoom_meeting_id,
      zoomPasscode: event.zoom_passcode,
    }
  );

  let emailSent = 0;
  if (process.env.RESEND_API_KEY && emails.length > 0) {
    try {
      await sendBatchEmails({ to: emails, subject, html });
      emailSent = emails.length;
    } catch (err) {
      console.error(`[reminder] email error for event ${event.id}:`, err);
    }
  }

  // ─── LINE 送信 ────────────────────────────────────────
  // 申込者本人が紐付けたline_user_id への直接 push を優先。
  // それ以外は従来通り、主催者のフォロワー（=このイベント申込者）に multicast。
  let lineSent = 0;
  if (event.creator_id) {
    try {
      const { data: lineAccount } = await admin
        .from("line_accounts")
        .select("id, channel_access_token, is_active")
        .eq("user_id", event.creator_id)
        .maybeSingle();
      const acc = lineAccount as {
        id: string;
        channel_access_token: string | null;
        is_active: boolean;
      } | null;

      if (acc?.is_active && acc.channel_access_token) {
        const bubble = buildReminderFlexBubble(
          { ...event, booking_count: bookingRows.length },
          opts.baseUrl,
          opts.timeLabel
        );
        const altText = `🔔 ${opts.timeLabel}: ${event.title}`;

        // A) 申込者本人が紐付けたLINE userId への直接 push
        const directIds = bookingRows
          .map((b) => b.line_user_id)
          .filter((v): v is string => !!v);
        const dedupDirect = [...new Set(directIds)];
        for (const userId of dedupDirect) {
          try {
            await pushFlexMessage(acc.channel_access_token, userId, altText, bubble);
            lineSent++;
          } catch (err) {
            console.error(
              `[reminder] LINE push failed for ${userId}:`,
              err
            );
          }
        }

        // B) ユーザー登録参加者 → profiles.line_user_id 経由 + follower確認
        const userIds = bookingRows
          .filter((b): b is typeof b & { user_id: string } => !!b.user_id)
          .map((b) => b.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await admin
            .from("profiles")
            .select("line_user_id")
            .in("id", userIds)
            .not("line_user_id", "is", null);
          const profileLineIds = (profiles ?? [])
            .map((p: { line_user_id: string | null }) => p.line_user_id)
            .filter((v): v is string => !!v)
            .filter((v) => !dedupDirect.includes(v));
          if (profileLineIds.length > 0) {
            const { data: followers } = await admin
              .from("line_followers")
              .select("line_user_id")
              .eq("line_account_id", acc.id)
              .eq("is_following", true)
              .in("line_user_id", profileLineIds);
            const activeIds = (followers ?? [])
              .map((f: { line_user_id: string }) => f.line_user_id);
            if (activeIds.length > 0) {
              try {
                await multicastFlexMessage(
                  acc.channel_access_token,
                  activeIds,
                  altText,
                  bubble
                );
                lineSent += activeIds.length;
              } catch (err) {
                console.error(
                  `[reminder] LINE multicast failed for event ${event.id}:`,
                  err
                );
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`[reminder] LINE block error for event ${event.id}:`, err);
    }
  }

  // ─── 送信実績を記録 ────────────────────────────────────
  const channel =
    emailSent > 0 && lineSent > 0
      ? "both"
      : lineSent > 0
      ? "line"
      : "email";
  await admin.from("event_reminder_sends").insert({
    event_id: event.id,
    offset_hours: offsetHours,
    recipient_count: emailSent + lineSent,
    channel,
  } as never);

  return emailSent + lineSent;
}

/**
 * イベントの実効スケジュール（reminder_schedule か既定 [24, 3]）を返す。
 */
export function effectiveSchedule(event: EventLite): ReminderScheduleEntry[] {
  const parsed = parseReminderSchedule(event.reminder_schedule);
  if (parsed.length > 0) return parsed;
  return DEFAULT_REMINDER_OFFSETS.map((h) => ({ offset_hours: h }));
}

/**
 * 「いま送るべきリマインド」を判定する。
 *
 * 開催時刻 - offsetHours 時間 ≤ now < 開催時刻 のものを対象とし、
 * かつ event_reminder_sends に未登録のものを送る。
 * 過去にcronが走らなかった offsetHours も、まだ送ってなければ送る（取りこぼし防止）。
 */
export function shouldSendNow(
  eventDatetime: string,
  offsetHours: number,
  now: Date
): boolean {
  const eventTs = new Date(eventDatetime).getTime();
  const reminderTs = eventTs - offsetHours * 60 * 60 * 1000;
  // 開催時刻を過ぎたら以後は送らない
  if (now.getTime() >= eventTs) return false;
  return now.getTime() >= reminderTs;
}

/**
 * 該当する送信ラベル（「3日前」「1日前」など）を返す。
 * カスタムオフセットには「N時間前」を返す。
 */
export function offsetLabel(offsetHours: number): string {
  if (offsetHours === 168) return "1週間前";
  if (offsetHours === 72) return "3日前";
  if (offsetHours === 48) return "2日前";
  if (offsetHours === 24) return "明日開催";
  if (offsetHours === 6) return "まもなく開催（6時間前）";
  if (offsetHours === 3) return "まもなく開催";
  if (offsetHours >= 24 && offsetHours % 24 === 0) {
    return `${offsetHours / 24}日前`;
  }
  return `${offsetHours}時間前`;
}
