import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const SIZE = { width: 1080, height: 1920 };

interface EventData {
  id: string;
  title: string;
  datetime: string;
  location: string;
  capacity: number;
  price: number;
  booking_count: number;
  category?: string;
  image_url?: string | null;
}

function getTitleFontSize(title: string): number {
  if (title.length <= 15) return 72;
  if (title.length <= 30) return 58;
  return 48;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const host = request.headers.get("host") ?? "localhost:3007";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  let event: EventData | undefined;
  try {
    const res = await fetch(`${protocol}://${host}/api/events/${id}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      event = json.event;
    }
  } catch {
    /* ignore */
  }

  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  const title = event.title;
  const titleFontSize = getTitleFontSize(title);

  const dateStr = new Date(event.datetime).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  });
  const timeStr = new Date(event.datetime).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  const priceStr =
    event.price === 0
      ? "無料"
      : `¥${event.price.toLocaleString("ja-JP")}`;
  const remaining = event.capacity - event.booking_count;

  const hasImage = !!event.image_url;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
          ...(hasImage
            ? {}
            : {
                background:
                  "linear-gradient(160deg, #1A1A1A 0%, #2D2D2D 30%, #1A1A1A 70%, #333333 100%)",
              }),
        }}
      >
        {/* Background image (when available) */}
        {hasImage && (
          <img
            src={event.image_url!}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {/* Gradient overlay for image */}
        {hasImage && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.75) 100%)",
            }}
          />
        )}

        {/* Decorative circles for no-image background */}
        {!hasImage && (
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.03)",
              display: "flex",
            }}
          />
        )}
        {!hasImage && (
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: -60,
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.02)",
              display: "flex",
            }}
          />
        )}

        {/* Content layer */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "120px 72px 100px",
          }}
        >
          {/* Brand badge (top) */}
          <div
            style={{
              position: "absolute",
              top: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 30,
              padding: "12px 28px",
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: "0.05em",
              }}
            >
              プチイベント作成くん
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              fontSize: titleFontSize,
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1.35,
              textAlign: "center",
              maxWidth: 920,
              textShadow: "0 2px 16px rgba(0,0,0,0.5)",
            }}
          >
            {title}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 80,
              height: 3,
              borderRadius: 2,
              background: "rgba(255,255,255,0.6)",
              marginTop: 48,
              marginBottom: 48,
            }}
          />

          {/* Date */}
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              color: "#FFFFFF",
              textShadow: "0 1px 8px rgba(0,0,0,0.4)",
            }}
          >
            {dateStr} {timeStr}〜
          </div>

          {/* Location */}
          {event.location && (
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 500,
                color: "rgba(255,255,255,0.85)",
                marginTop: 20,
                textShadow: "0 1px 8px rgba(0,0,0,0.4)",
              }}
            >
              {event.location}
            </div>
          )}

          {/* Badges (bottom) */}
          <div
            style={{
              position: "absolute",
              bottom: 100,
              display: "flex",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 24,
                padding: "14px 32px",
                fontSize: 30,
                fontWeight: 700,
                color: "#FFFFFF",
              }}
            >
              {priceStr}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 24,
                padding: "14px 32px",
                fontSize: 28,
                fontWeight: 600,
                color: "#FFFFFF",
              }}
            >
              {remaining <= 0 ? "満員" : `定員${event.capacity}名`}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Content-Disposition": `attachment; filename="event-story-${id}.png"`,
      },
    }
  );

  return response;
}
