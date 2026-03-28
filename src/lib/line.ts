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
