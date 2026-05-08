"use client";

import { useEffect, useRef } from "react";

type Props = {
  eventId: string;
};

/**
 * Records a view on the event detail page. Captures referrer + UTM params
 * available client-side and posts them to /api/events/[id]/view, which
 * persists them server-side along with an anonymous cookie ID.
 *
 * Once per mount per (eventId) — guards against React Strict Mode double mount.
 */
export function ViewTracker({ eventId }: Props) {
  const sentRef = useRef<string | null>(null);

  useEffect(() => {
    if (sentRef.current === eventId) return;
    sentRef.current = eventId;

    const params = new URLSearchParams(window.location.search);
    const payload = {
      referrer: document.referrer || null,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    };

    fetch(`/api/events/${eventId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // best-effort tracking; never block the user
    });
  }, [eventId]);

  return null;
}
