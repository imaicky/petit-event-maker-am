/**
 * Google Calendar / iCal URL generation utilities.
 * Extracted from events/[id]/thanks/page.tsx for reuse.
 */

interface CalendarEvent {
  title: string;
  datetime: string;
  location?: string;
  description?: string;
}

/**
 * Build a Google Calendar "Add event" URL.
 * Duration defaults to 1 hour.
 */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = new Date(event.datetime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: event.location ?? "",
    details: (event.description ?? "").slice(0, 200),
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}
