import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { CATEGORY_ICONS } from "@/lib/constants";

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
  const categoryIcon = CATEGORY_ICONS[event.category ?? ""] ?? "🎉";
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

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#FAFAFA",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background decorations */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(26, 26, 26, 0.04)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "rgba(64, 64, 64, 0.04)",
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            height: 12,
            background: "linear-gradient(90deg, #1A1A1A 0%, #888888 100%)",
            width: "100%",
          }}
        />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "80px 72px",
            gap: 48,
          }}
        >
          {/* Category icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 32,
              background: "#F2F2F2",
              fontSize: 64,
            }}
          >
            {categoryIcon}
          </div>

          {/* Category label */}
          {event.category && (
            <div
              style={{
                display: "flex",
                background: "#1A1A1A",
                color: "#FFFFFF",
                borderRadius: 24,
                padding: "12px 32px",
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              {event.category}
            </div>
          )}

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 20 ? 56 : 68,
              fontWeight: 900,
              color: "#1A1A1A",
              lineHeight: 1.3,
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 80,
              height: 4,
              borderRadius: 2,
              background: "#1A1A1A",
            }}
          />

          {/* Meta info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              alignItems: "center",
            }}
          >
            {/* Date */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "#FFFFFF",
                border: "3px solid #E5E5E5",
                borderRadius: 20,
                padding: "16px 32px",
              }}
            >
              <span style={{ fontSize: 32 }}>📅</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1A1A1A",
                }}
              >
                {dateStr} {timeStr}〜
              </span>
            </div>

            {/* Location */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                background: "#FFFFFF",
                border: "3px solid #E5E5E5",
                borderRadius: 20,
                padding: "16px 32px",
              }}
            >
              <span style={{ fontSize: 32 }}>📍</span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1A1A1A",
                }}
              >
                {event.location}
              </span>
            </div>

            {/* Price & spots */}
            <div style={{ display: "flex", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#1A1A1A",
                  borderRadius: 20,
                  padding: "16px 36px",
                  fontSize: 36,
                  fontWeight: 900,
                  color: "#FFFFFF",
                }}
              >
                {priceStr}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: remaining <= 3 ? "#1A1A1A" : "#404040",
                  borderRadius: 20,
                  padding: "16px 36px",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                {remaining <= 0
                  ? "満員"
                  : `残り${remaining}名`}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom brand bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "32px 0 48px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#1A1A1A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#FFFFFF",
            }}
          >
            🎉
          </div>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#999999",
            }}
          >
            プチイベント作成くん
          </span>
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
