import { describe, it, expect } from "vitest";
import { TEMPLATES, CATEGORIES } from "./templates";

describe("CATEGORIES", () => {
  it("contains AI領域カテゴリ（主軸）", () => {
    expect(CATEGORIES).toContain("LLM活用");
    expect(CATEGORIES).toContain("画像生成");
    expect(CATEGORIES).toContain("プロンプトエンジニアリング");
    expect(CATEGORIES).toContain("AI開発・実装");
    expect(CATEGORIES).toContain("AI×ビジネス");
  });

  it("ライフスタイル系も後方互換で残す", () => {
    expect(CATEGORIES).toContain("フラワー");
    expect(CATEGORIES).toContain("ハンドメイド");
    expect(CATEGORIES).toContain("ヨガ");
    expect(CATEGORIES).toContain("Instagram");
  });

  it("AI領域が先頭側に並ぶ（ライフスタイルより前）", () => {
    const idxLLM = CATEGORIES.indexOf("LLM活用");
    const idxFlower = CATEGORIES.indexOf("フラワー");
    expect(idxLLM).toBeGreaterThanOrEqual(0);
    expect(idxFlower).toBeGreaterThan(idxLLM);
  });
});

describe("TEMPLATES", () => {
  it("contains both lifestyle and AI templates", () => {
    const ids = TEMPLATES.map((t) => t.id);
    // legacy lifestyle
    expect(ids).toContain("flower");
    expect(ids).toContain("yoga");
    // AI templates
    expect(ids).toContain("ai-llm-basic");
    expect(ids).toContain("ai-prompt-eng");
    expect(ids).toContain("ai-image-gen");
  });

  it("each template has required fields", () => {
    for (const t of TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.icon).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(typeof t.defaultCapacity).toBe("number");
      expect(typeof t.defaultPrice).toBe("number");
      expect(t.defaultCapacity).toBeGreaterThan(0);
      expect(t.defaultPrice).toBeGreaterThanOrEqual(0);
    }
  });

  it("AI templates have AI-related categories", () => {
    const aiTemplates = TEMPLATES.filter((t) => t.id.startsWith("ai-"));
    expect(aiTemplates.length).toBeGreaterThanOrEqual(7);
    for (const t of aiTemplates) {
      // category should be an AI-area category
      const aiCategories = [
        "LLM活用",
        "画像生成",
        "動画生成・編集",
        "プロンプトエンジニアリング",
        "AI開発・実装",
        "AI×ビジネス",
        "AI×クリエイティブ",
        "AIコミュニティ・座談会",
      ];
      expect(aiCategories).toContain(t.category);
    }
  });

  it("description contains useful structured info (持ち物, 価格等)", () => {
    for (const t of TEMPLATES) {
      // description は数百文字あるはず
      expect(t.description.length).toBeGreaterThan(50);
    }
  });

  it("all template IDs are unique", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("legacy templates use legacy categories from CATEGORIES", () => {
    const legacy = TEMPLATES.filter((t) => !t.id.startsWith("ai-"));
    for (const t of legacy) {
      expect(CATEGORIES).toContain(t.category as (typeof CATEGORIES)[number]);
    }
  });
});
