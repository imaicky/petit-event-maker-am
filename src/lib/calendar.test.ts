import { describe, it, expect } from "vitest";
import { buildGoogleCalendarUrl } from "./calendar";

describe("buildGoogleCalendarUrl", () => {
  const baseEvent = {
    title: "テストイベント",
    description: "説明文",
    location: "東京都渋谷区",
    datetime: "2026-06-01T10:00:00+09:00",
  };

  it("returns a Google Calendar URL", () => {
    const url = buildGoogleCalendarUrl(baseEvent);
    expect(url).toContain("https://www.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
  });

  it("URL-encodes title with Japanese characters", () => {
    const url = buildGoogleCalendarUrl(baseEvent);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("text")).toBe("テストイベント");
  });

  it("includes location in details", () => {
    const url = buildGoogleCalendarUrl(baseEvent);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("location")).toContain("東京都渋谷区");
  });

  it("formats dates in Google Calendar's compact UTC format (YYYYMMDDTHHmmssZ)", () => {
    const url = buildGoogleCalendarUrl(baseEvent);
    const parsed = new URL(url);
    const dates = parsed.searchParams.get("dates");
    expect(dates).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);
  });

  it("creates a 1-hour default duration when no end time is given", () => {
    const url = buildGoogleCalendarUrl(baseEvent);
    const parsed = new URL(url);
    const dates = parsed.searchParams.get("dates");
    const [start, end] = (dates ?? "").split("/");
    // 終了は開始より約1時間後
    expect(end).not.toBe(start);
    expect(end > start).toBe(true);
  });

  it("handles description safely", () => {
    const url = buildGoogleCalendarUrl({
      ...baseEvent,
      description: "改行入り\n説明文",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("details")).toContain("説明文");
  });
});
