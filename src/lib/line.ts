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

type EventForFlex = {
  id: string;
  title: string;
  datetime: string;
  location?: string | null;
  price: number;
  capacity?: number | null;
  image_url?: string | null;
  booking_count?: number;
};

function formatDateJa(iso: string): string {
  try {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[d.getDay()];
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${month}月${day}日(${weekday}) ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

export function buildEventFlexBubble(
  event: EventForFlex,
  baseUrl: string
): FlexContainer {
  const dateStr = formatDateJa(event.datetime);
  const priceStr = event.price === 0 ? "無料" : `¥${event.price.toLocaleString()}`;
  const remaining =
    event.capacity != null && event.booking_count != null
      ? `残${event.capacity - event.booking_count}枠`
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
            label: "詳細・予約はこちら",
            uri: `${baseUrl}/events/${event.id}`,
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
