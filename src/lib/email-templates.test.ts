import { describe, it, expect } from "vitest";
import {
  fillTemplate,
  wrapInHtml,
  buildReminderEmailHtml,
  EMAIL_TEMPLATES,
} from "./email-templates";

describe("fillTemplate", () => {
  const vars = {
    eventTitle: "テストイベント",
    eventDate: "2026年6月1日 10:00",
    eventLocation: "東京都渋谷区",
    eventUrl: "https://example.com/events/abc",
  };

  it("replaces all placeholders", () => {
    const r = fillTemplate(
      "{eventTitle}は{eventDate}に{eventLocation}で開催。詳細: {eventUrl}",
      vars
    );
    expect(r).toBe(
      "テストイベントは2026年6月1日 10:00に東京都渋谷区で開催。詳細: https://example.com/events/abc"
    );
  });

  it("replaces multiple occurrences of the same placeholder", () => {
    const r = fillTemplate("{eventTitle}と{eventTitle}", vars);
    expect(r).toBe("テストイベントとテストイベント");
  });

  it("leaves unknown placeholders untouched", () => {
    const r = fillTemplate("{unknown}と{eventTitle}", vars);
    expect(r).toBe("{unknown}とテストイベント");
  });

  it("handles empty values without errors", () => {
    const r = fillTemplate("[{eventTitle}][{eventDate}]", {
      eventTitle: "",
      eventDate: "",
      eventLocation: "",
      eventUrl: "",
    });
    expect(r).toBe("[][]");
  });
});

describe("wrapInHtml", () => {
  it("wraps content in HTML structure", () => {
    const html = wrapInHtml("こんにちは", "テストイベント");
    expect(html).toContain("こんにちは");
    expect(html).toContain("テストイベント");
    expect(html).toMatch(/<!DOCTYPE html>/i);
  });

  it("escapes HTML special characters in body (XSS防止)", () => {
    const html = wrapInHtml("<script>alert('xss')</script>", "title");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("converts newlines to <br>", () => {
    const html = wrapInHtml("一行目\n二行目", "title");
    expect(html).toContain("一行目<br>二行目");
  });

  it("escapes ampersands", () => {
    const html = wrapInHtml("A & B", "title");
    expect(html).toContain("A &amp; B");
  });
});

describe("buildReminderEmailHtml", () => {
  it("builds physical event reminder", () => {
    const html = buildReminderEmailHtml(
      "ヨガ教室",
      "2026年6月1日 10:00",
      "東京都渋谷区",
      "明日開催！"
    );
    expect(html).toContain("ヨガ教室");
    expect(html).toContain("東京都渋谷区");
    expect(html).toContain("明日開催！");
    expect(html).not.toContain("Zoom");
  });

  it("includes Zoom info for online events with meeting ID", () => {
    const html = buildReminderEmailHtml(
      "オンライン勉強会",
      "2026年6月1日 10:00",
      "オンライン",
      "明日開催！",
      {
        locationType: "online",
        zoomMeetingId: "123-456-789",
        zoomPasscode: "secret",
        onlineUrl: "https://zoom.us/j/123",
      }
    );
    expect(html).toContain("123-456-789");
    expect(html).toContain("secret");
    expect(html).toContain("zoom.us/j/123");
  });

  it("falls back to URL only when no meeting ID", () => {
    const html = buildReminderEmailHtml(
      "オンライン会",
      "日時",
      "オンライン",
      "ラベル",
      {
        locationType: "online",
        onlineUrl: "https://meet.google.com/abc",
      }
    );
    expect(html).toContain("meet.google.com");
    expect(html).not.toContain("ZoomミーティングID");
  });

  it("shows 'オンライン' when no online info provided for online event", () => {
    const html = buildReminderEmailHtml("会", "日時", "あ", "ラベル", {
      locationType: "online",
    });
    expect(html).toContain("オンライン");
  });

  it("hybrid event includes both physical location and online info", () => {
    const html = buildReminderEmailHtml(
      "ハイブリッド会",
      "日時",
      "渋谷ホール",
      "ラベル",
      {
        locationType: "hybrid",
        onlineUrl: "https://meet.example.com/abc",
      }
    );
    expect(html).toContain("渋谷ホール");
    expect(html).toContain("meet.example.com");
  });
});

describe("EMAIL_TEMPLATES", () => {
  it("contains the expected template IDs", () => {
    const ids = EMAIL_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("reminder");
    expect(ids).toContain("change");
    expect(ids).toContain("thanks");
    expect(ids).toContain("custom");
  });

  it("each template has required fields", () => {
    for (const t of EMAIL_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(typeof t.defaultSubject).toBe("string");
      expect(typeof t.defaultBody).toBe("string");
      expect(typeof t.emoji).toBe("string");
    }
  });

  it("placeholders in body match expected pattern", () => {
    const validPlaceholders = [
      "{eventTitle}",
      "{eventDate}",
      "{eventLocation}",
      "{eventUrl}",
    ];
    for (const t of EMAIL_TEMPLATES) {
      const matches = t.defaultBody.match(/\{[a-zA-Z]+\}/g) ?? [];
      for (const m of matches) {
        expect(validPlaceholders).toContain(m);
      }
    }
  });
});
