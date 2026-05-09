import { describe, it, expect } from "vitest";
import { inferAiLevel, isAiLegacy, AI_CATEGORY_SLUGS } from "./user-history";

describe("inferAiLevel", () => {
  it("returns 未参加 for 0 events", () => {
    expect(inferAiLevel(0, 0)).toBe("未参加");
    expect(inferAiLevel(0, 5)).toBe("未参加"); // domains alone don't matter
  });

  it("returns 入門 for 1-2 events regardless of domains", () => {
    expect(inferAiLevel(1, 1)).toBe("入門");
    expect(inferAiLevel(2, 2)).toBe("入門");
  });

  it("returns 初級 for 3-5 events with <3 domains", () => {
    expect(inferAiLevel(3, 1)).toBe("初級");
    expect(inferAiLevel(4, 2)).toBe("初級");
    expect(inferAiLevel(5, 2)).toBe("初級");
  });

  it("promotes to 中級 for 3-5 events when domains spread (>=3)", () => {
    expect(inferAiLevel(3, 3)).toBe("中級");
    expect(inferAiLevel(5, 5)).toBe("中級");
  });

  it("returns 中級 for 6-10 events", () => {
    expect(inferAiLevel(6, 1)).toBe("中級");
    expect(inferAiLevel(10, 9)).toBe("中級");
  });

  it("returns 上級 for 11+ events", () => {
    expect(inferAiLevel(11, 0)).toBe("上級");
    expect(inferAiLevel(50, 9)).toBe("上級");
  });

  it("monotonic: more events should never DECREASE the level (rough check)", () => {
    const order = ["未参加", "入門", "初級", "中級", "上級"];
    let lastIdx = 0;
    for (const c of [0, 1, 3, 6, 11, 50]) {
      const lvl = inferAiLevel(c, 1);
      const idx = order.indexOf(lvl);
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
  });
});

describe("isAiLegacy", () => {
  it("matches AI-related Japanese keywords", () => {
    expect(isAiLegacy("AI勉強会")).toBe(true);
    expect(isAiLegacy("生成AI入門")).toBe(true);
    expect(isAiLegacy("プロンプト講座")).toBe(true);
    expect(isAiLegacy("ＡＩコミュニティ")).toBe(true); // 全角
  });

  it("rejects non-AI categories", () => {
    expect(isAiLegacy("フラワー")).toBe(false);
    expect(isAiLegacy("ヨガ")).toBe(false);
    expect(isAiLegacy("ランチ会")).toBe(false);
  });

  it("handles null / empty / undefined safely", () => {
    expect(isAiLegacy(null)).toBe(false);
    expect(isAiLegacy(undefined)).toBe(false);
    expect(isAiLegacy("")).toBe(false);
  });

  it("is case insensitive for ASCII AI", () => {
    expect(isAiLegacy("ai セミナー")).toBe(true);
    expect(isAiLegacy("Ai")).toBe(true);
  });
});

describe("AI_CATEGORY_SLUGS", () => {
  it("contains expected core AI categories", () => {
    const required = [
      "llm",
      "image-gen",
      "video-gen",
      "audio",
      "prompt-eng",
      "ai-dev",
      "ai-business",
      "ai-creative",
      "ai-community",
    ];
    for (const slug of required) {
      expect(AI_CATEGORY_SLUGS.has(slug)).toBe(true);
    }
  });

  it("does NOT contain lifestyle (intentional separation)", () => {
    expect(AI_CATEGORY_SLUGS.has("lifestyle")).toBe(false);
  });
});
