import { describe, it, expect } from "vitest";
import { TEMPLATES, CATEGORIES } from "./templates";

describe("CATEGORIES", () => {
  it("AI領域のカテゴリを含む", () => {
    expect(CATEGORIES).toContain("LLM活用");
    expect(CATEGORIES).toContain("画像生成");
    expect(CATEGORIES).toContain("AI×ビジネス");
  });

  it("教室・ライフスタイル系のカテゴリを含む", () => {
    expect(CATEGORIES).toContain("フラワー");
    expect(CATEGORIES).toContain("ハンドメイド");
    expect(CATEGORIES).toContain("ヨガ");
    expect(CATEGORIES).toContain("Instagram");
  });

  it("SNS / 動画クリエイター / 教室レッスン / 飲み会の新ジャンルを含む", () => {
    expect(CATEGORIES).toContain("YouTube・動画");
    expect(CATEGORIES).toContain("お教室・レッスン");
    expect(CATEGORIES).toContain("飲み会・交流会");
  });
});

describe("TEMPLATES", () => {
  it("生活系・SNS系・AI系のテンプレートを含む", () => {
    const ids = TEMPLATES.map((t) => t.id);
    // 生活系
    expect(ids).toContain("flower");
    expect(ids).toContain("yoga");
    expect(ids).toContain("lesson");
    // SNS / 動画
    expect(ids).toContain("instagram");
    expect(ids).toContain("youtube");
    // AI
    expect(ids).toContain("ai-llm-basic");
    expect(ids).toContain("ai-image-gen");
  });

  it("各テンプレートに必須フィールドが揃っている", () => {
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

  it("AI テンプレートが AI 関連カテゴリを使う", () => {
    const aiTemplates = TEMPLATES.filter((t) => t.id.startsWith("ai-"));
    expect(aiTemplates.length).toBeGreaterThanOrEqual(1);
    const aiCategories = [
      "LLM活用",
      "画像生成",
      "動画生成・編集",
      "プロンプトエンジニアリング",
      "AI開発・実装",
      "AI×ビジネス",
      "AI×クリエイティブ",
    ];
    for (const t of aiTemplates) {
      expect(aiCategories).toContain(t.category);
    }
  });

  it("description が一定の長さを持つ", () => {
    for (const t of TEMPLATES) {
      expect(t.description.length).toBeGreaterThan(50);
    }
  });

  it("全テンプレ ID がユニーク", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("全テンプレの category が CATEGORIES に含まれる", () => {
    for (const t of TEMPLATES) {
      expect(CATEGORIES).toContain(t.category as (typeof CATEGORIES)[number]);
    }
  });
});
