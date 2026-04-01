import { createHmac, timingSafeEqual } from "crypto";

const LINE_API_BASE = "https://api.line.me/v2";

type LineBotInfo = {
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
};

type LineApiError = {
  message: string;
  details?: unknown;
};

export async function getLineBotInfo(
  channelAccessToken: string
): Promise<{ ok: true; data: LineBotInfo } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${LINE_API_BASE}/bot/info`, {
      method: "GET",
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as LineApiError;
      return {
        ok: false,
        error: body.message || `LINE API error (${res.status})`,
      };
    }

    const data = (await res.json()) as LineBotInfo;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "LINE APIへの接続に失敗しました" };
  }
}

export async function broadcastLineMessage(
  channelAccessToken: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${LINE_API_BASE}/bot/message/broadcast`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as LineApiError;
      return {
        ok: false,
        error: body.message || `LINE API error (${res.status})`,
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "LINE APIへの接続に失敗しました" };
  }
}

// ─── Flex Message ─────────────────────────────────────────

type FlexContainer = Record<string, unknown>;

export async function broadcastFlexMessage(
  channelAccessToken: string,
  altText: string,
  contents: FlexContainer
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${LINE_API_BASE}/bot/message/broadcast`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ type: "flex", altText, contents }],
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as LineApiError;
      return {
        ok: false,
        error: body.message || `LINE API error (${res.status})`,
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "LINE APIへの接続に失敗しました" };
  }
}

// ─── Webhook Signature Verification ──────────────────────────

export function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  const hash = createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Push Message (1:1 DM) ──────────────────────────────────

export async function pushLineMessage(
  channelAccessToken: string,
  userId: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${LINE_API_BASE}/bot/message/push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as LineApiError;
      return {
        ok: false,
        error: body.message || `LINE API error (${res.status})`,
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "LINE APIへの接続に失敗しました" };
  }
}

// ─── Get User Profile ───────────────────────────────────────

type LineUserProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

export async function getLineUserProfile(
  channelAccessToken: string,
  userId: string
): Promise<{ ok: true; data: LineUserProfile } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${LINE_API_BASE}/bot/profile/${userId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as LineApiError;
      return {
        ok: false,
        error: body.message || `LINE API error (${res.status})`,
      };
    }

    const data = (await res.json()) as LineUserProfile;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "LINE APIへの接続に失敗しました" };
  }
}

// ─── Flex Message Helpers ───────────────────────────────────

type EventForFlex = {
  id: string;
  title: string;
  datetime: string;
  location?: string | null;
  price: number;
  capacity?: number | null;
  image_url?: string | null;
  booking_count?: number;
  short_code?: string | null;
};

function formatDateJa(iso: string): string {
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return fmt.format(d);
  } catch {
    return iso;
  }
}

export function buildEventFlexBubble(
  event: EventForFlex,
  baseUrl: string
): FlexContainer {
  const eventUrl = event.short_code
    ? `${baseUrl}/e/${event.short_code}`
    : `${baseUrl}/events/${event.id}`;
  const dateStr = formatDateJa(event.datetime);
  const priceStr = event.price === 0 ? "無料" : `¥${event.price.toLocaleString()}`;
  const remaining =
    event.capacity != null && event.booking_count != null
      ? `残${Math.max(0, event.capacity - event.booking_count)}枠`
      : event.capacity != null
        ? `定員${event.capacity}名`
        : "";

  const heroSection = event.image_url
    ? {
        type: "image",
        url: event.image_url,
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
      }
    : null;

  const bodyContents: Record<string, unknown>[] = [
    {
      type: "text",
      text: event.title,
      weight: "bold",
      size: "lg",
      wrap: true,
    },
    {
      type: "box",
      layout: "vertical",
      margin: "lg",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "baseline",
          spacing: "sm",
          contents: [
            { type: "text", text: "📅", size: "sm", flex: 0 },
            { type: "text", text: dateStr, size: "sm", color: "#666666", flex: 5, wrap: true },
          ],
        },
        ...(event.location
          ? [
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  { type: "text", text: "📍", size: "sm", flex: 0 },
                  { type: "text", text: event.location, size: "sm", color: "#666666", flex: 5, wrap: true },
                ],
              },
            ]
          : []),
        {
          type: "box",
          layout: "baseline",
          spacing: "sm",
          contents: [
            { type: "text", text: priceStr, size: "sm", color: "#1A1A1A", weight: "bold", flex: 0 },
            ...(remaining
              ? [{ type: "text", text: remaining, size: "sm", color: "#06C755", align: "end" }]
              : []),
          ],
        },
      ],
    },
  ];

  const bubble: Record<string, unknown> = {
    type: "bubble",
    ...(heroSection ? { hero: heroSection } : {}),
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#1A1A1A",
          action: {
            type: "uri",
            label: "予約する",
            uri: eventUrl,
          },
        },
      ],
      flex: 0,
    },
  };

  return bubble;
}

// ─── Push Flex Message (1:1) ────────────────────────────────

export async function pushFlexMessage(
  channelAccessToken: string,
  userId: string,
  altText: string,
  contents: FlexContainer
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${LINE_API_BASE}/bot/message/push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "flex", altText, contents }],
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as LineApiError;
      return {
        ok: false,
        error: body.message || `LINE API error (${res.status})`,
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "LINE APIへの接続に失敗しました" };
  }
}

// ─── Multicast (multiple users) ────────────────────────────

const MULTICAST_CHUNK_SIZE = 500;

async function multicastMessages(
  channelAccessToken: string,
  userIds: string[],
  messages: Record<string, unknown>[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (userIds.length === 0) return { ok: true };
  try {
    for (let i = 0; i < userIds.length; i += MULTICAST_CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + MULTICAST_CHUNK_SIZE);
      const res = await fetch(`${LINE_API_BASE}/bot/message/multicast`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: chunk, messages }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as LineApiError;
        return {
          ok: false,
          error: body.message || `LINE API error (${res.status})`,
        };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "LINE APIへの接続に失敗しました" };
  }
}

export async function multicastLineMessage(
  channelAccessToken: string,
  userIds: string[],
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  return multicastMessages(channelAccessToken, userIds, [{ type: "text", text }]);
}

export async function multicastFlexMessage(
  channelAccessToken: string,
  userIds: string[],
  altText: string,
  contents: FlexContainer
): Promise<{ ok: true } | { ok: false; error: string }> {
  return multicastMessages(channelAccessToken, userIds, [{ type: "flex", altText, contents }]);
}

// ─── Reminder Flex Bubble ──────────────────────────────────

export function buildReminderFlexBubble(
  event: EventForFlex,
  baseUrl: string,
  timeLabel: string
): FlexContainer {
  const eventUrl = event.short_code
    ? `${baseUrl}/e/${event.short_code}`
    : `${baseUrl}/events/${event.id}`;
  const dateStr = formatDateJa(event.datetime);

  const bubble: Record<string, unknown> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `🔔 ${timeLabel}`,
          color: "#06C755",
          size: "sm",
          weight: "bold",
        },
        {
          type: "text",
          text: event.title,
          weight: "bold",
          size: "lg",
          wrap: true,
          margin: "md",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "📅", size: "sm", flex: 0 },
                { type: "text", text: dateStr, size: "sm", color: "#666666", flex: 5, wrap: true },
              ],
            },
            ...(event.location
              ? [
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      { type: "text", text: "📍", size: "sm", flex: 0 },
                      { type: "text", text: event.location, size: "sm", color: "#666666", flex: 5, wrap: true },
                    ],
                  },
                ]
              : []),
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#1A1A1A",
          action: {
            type: "uri",
            label: "イベント詳細",
            uri: eventUrl,
          },
        },
      ],
      flex: 0,
    },
  };

  return bubble;
}

// ─── Booking Confirmation Flex (for attendees) ─────────────

export function buildBookingConfirmationFlex(
  event: EventForFlex,
  guestName: string,
  baseUrl: string
): FlexContainer {
  const eventUrl = event.short_code
    ? `${baseUrl}/e/${event.short_code}`
    : `${baseUrl}/events/${event.id}`;
  const dateStr = formatDateJa(event.datetime);
  const priceStr = event.price === 0 ? "無料" : `¥${event.price.toLocaleString()}`;

  const bubble: Record<string, unknown> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "✅ 予約が完了しました",
          color: "#06C755",
          size: "sm",
          weight: "bold",
        },
        {
          type: "text",
          text: event.title,
          weight: "bold",
          size: "lg",
          wrap: true,
          margin: "md",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "👤", size: "sm", flex: 0 },
                { type: "text", text: `${guestName} 様`, size: "sm", color: "#666666", flex: 5 },
              ],
            },
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "📅", size: "sm", flex: 0 },
                { type: "text", text: dateStr, size: "sm", color: "#666666", flex: 5, wrap: true },
              ],
            },
            ...(event.location
              ? [
                  {
                    type: "box",
                    layout: "baseline",
                    spacing: "sm",
                    contents: [
                      { type: "text", text: "📍", size: "sm", flex: 0 },
                      { type: "text", text: event.location, size: "sm", color: "#666666", flex: 5, wrap: true },
                    ],
                  },
                ]
              : []),
            {
              type: "box",
              layout: "baseline",
              spacing: "sm",
              contents: [
                { type: "text", text: "💰", size: "sm", flex: 0 },
                { type: "text", text: priceStr, size: "sm", color: "#1A1A1A", weight: "bold", flex: 5 },
              ],
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#1A1A1A",
          action: {
            type: "uri",
            label: "イベント詳細",
            uri: eventUrl,
          },
        },
      ],
      flex: 0,
    },
  };

  return bubble;
}

export function buildBookingNotifyText(
  eventTitle: string,
  guestName: string,
  currentCount: number,
  capacity: number | null
): string {
  const capacityStr = capacity != null ? `（現在${currentCount}名／定員${capacity}名）` : `（現在${currentCount}名）`;
  return `📩 新しい予約がありました\n\n${eventTitle}\n${guestName}さんが予約しました${capacityStr}`;
}

export function buildMenuBookingNotifyText(
  menuTitle: string,
  guestName: string,
  currentCount: number,
  capacity: number | null
): string {
  const capacityStr = capacity != null ? `（現在${currentCount}名／定員${capacity}名）` : `（現在${currentCount}名）`;
  return `📩 メニューに新しい申し込みがありました\n\n${menuTitle}\n${guestName}さんが申し込みました${capacityStr}`;
}
