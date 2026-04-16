import { ImageResponse } from "next/og";
import { headers } from "next/headers";

export const alt = "イベント詳細";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

interface Props {
  params: Promise<{ id: string }>;
}

interface EventData {
  id: string;
  title: string;
  datetime: string;
  location: string;
  location_type?: string | null;
  online_url?: string | null;
  capacity: number;
  price: number;
  booking_count: number;
  image_url?: string | null;
}

export default async function Image({ params }: Props) {
  const { id } = await params;

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3007";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  let event: EventData | undefined;
  try {
    const res = await fetch(`${protocol}://${host}/api/events/${id}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      event = json.event;
    }
  } catch { /* ignore */ }

  const title = event?.title ?? "イベント詳細";
  const dateStr = event?.datetime
    ? new Date(event.datetime).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        timeZone: "Asia/Tokyo",
      })
    : "";
  const timeStr = event?.datetime
    ? new Date(event.datetime).toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      })
    : "";
  const priceStr = event
    ? event.price === 0
      ? "無料"
      : `¥${event.price.toLocaleString("ja-JP")}`
    : "";
  const remaining = event ? event.capacity - event.booking_count : 0;
  const location = event
    ? event.location_type === "online"
      ? "オンライン"
      : event.location_type === "hybrid"
      ? "対面 + オンライン"
      : "対面"
    : "";

  if (event?.image_url) {
    // Image background layout
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            fontFamily: "sans-serif",
            overflow: "hidden",
          }}
        >
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.image_url}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Gradient overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              height: "70%",
              background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
            }}
          />

          {/* Content overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              padding: "0 60px 40px",
              gap: 16,
            }}
          >
            {/* Brand */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 20 }}>🎉</span>
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                プチイベント作成くん
              </span>
            </div>

            {/* Event title */}
            <div
              style={{
                fontSize: title.length > 30 ? 40 : 48,
                fontWeight: 900,
                color: "#FFFFFF",
                lineHeight: 1.2,
                maxWidth: 900,
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              {title}
            </div>

            {/* Meta row */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
              {dateStr && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>📅</span>
                  <span style={{ fontSize: 18, color: "#FFFFFF", fontWeight: 600 }}>
                    {dateStr} {timeStr}〜
                  </span>
                </div>
              )}
              {location && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                  <span style={{ fontSize: 18, color: "#FFFFFF", fontWeight: 600 }}>
                    {location}
                  </span>
                </div>
              )}
              {priceStr && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>💴</span>
                  <span style={{ fontSize: 18, color: "#FFFFFF", fontWeight: 700 }}>
                    {priceStr}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      size
    );
  }

  // Text-only layout (no image)
  return new ImageResponse(
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
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(212,132,90,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "rgba(91,138,114,0.10)",
          }}
        />

        {/* Top accent bar */}
        <div
          style={{
            height: 8,
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
            padding: "48px 72px",
            gap: 24,
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#1A1A1A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: "#fff",
                fontWeight: 700,
              }}
            >
              🎉
            </div>
            <span style={{ fontSize: 16, color: "#999999", fontWeight: 600 }}>
              プチイベント作成くん
            </span>
          </div>

          {/* Event title */}
          <div
            style={{
              fontSize: title.length > 30 ? 42 : 52,
              fontWeight: 900,
              color: "#1A1A1A",
              lineHeight: 1.2,
              maxWidth: 900,
            }}
          >
            {title}
          </div>

          {/* Meta chips */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {dateStr && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "2px solid #E5E5E5",
                  borderRadius: 12,
                  padding: "10px 18px",
                }}
              >
                <span style={{ fontSize: 20 }}>📅</span>
                <span style={{ fontSize: 18, color: "#1A1A1A", fontWeight: 600 }}>
                  {dateStr} {timeStr}〜
                </span>
              </div>
            )}
            {location && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "2px solid #E5E5E5",
                  borderRadius: 12,
                  padding: "10px 18px",
                }}
              >
                <span style={{ fontSize: 20 }}>📍</span>
                <span style={{ fontSize: 18, color: "#1A1A1A", fontWeight: 600 }}>
                  {location}
                </span>
              </div>
            )}
          </div>

          {/* Price & spots row */}
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {priceStr && (
              <div
                style={{
                  background: "#F7F7F7",
                  border: "2px solid #1A1A1A",
                  borderRadius: 12,
                  padding: "10px 24px",
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#1A1A1A",
                }}
              >
                {priceStr}
              </div>
            )}
            {event && (
              <div
                style={{
                  background: remaining <= 0 ? "#F7F7F7" : "#EFF6F2",
                  border: `2px solid ${remaining <= 0 ? "#1A1A1A" : "#404040"}`,
                  borderRadius: 12,
                  padding: "10px 24px",
                  fontSize: 20,
                  fontWeight: 700,
                  color: remaining <= 0 ? "#1A1A1A" : "#404040",
                }}
              >
                {remaining <= 0
                  ? "満員"
                  : `定員${event.capacity}名`}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size
  );
}
