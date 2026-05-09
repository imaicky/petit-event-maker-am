import { describe, it, expect } from "vitest";
import {
  dominantLevelFromDistribution,
  buildSuggestionsFromAudience,
} from "./syllabus-suggest";

describe("dominantLevelFromDistribution", () => {
  it("returns 初級 by default for empty distribution", () => {
    expect(dominantLevelFromDistribution({})).toBe("初級");
  });

  it("returns 初級 when all levels are zero", () => {
    expect(
      dominantLevelFromDistribution({ 未参加: 0, 入門: 0, 初級: 0 })
    ).toBe("初級");
  });

  it("returns the level with highest count", () => {
    expect(
      dominantLevelFromDistribution({
        未参加: 1,
        入門: 5,
        初級: 3,
        中級: 2,
      })
    ).toBe("入門");
  });

  it("handles ties (returns first match in object iteration)", () => {
    const r = dominantLevelFromDistribution({
      初級: 5,
      中級: 5,
    });
    expect(["初級", "中級"]).toContain(r);
  });
});

describe("buildSuggestionsFromAudience", () => {
  const baseArgs = {
    audienceCategories: [
      { name: "LLM活用", count: 8 },
      { name: "画像生成", count: 5 },
      { name: "プロンプトエンジニアリング", count: 3 },
    ],
    participantCount: 10,
    aiLevelDistribution: {
      未参加: 0,
      入門: 1,
      初級: 6,
      中級: 2,
      上級: 1,
    },
    ownCategoryNames: new Set<string>(),
    aiCategoryNames: new Set([
      "LLM活用",
      "画像生成",
      "プロンプトエンジニアリング",
    ]),
  };

  it("returns up to 3 suggestions from audience categories", () => {
    const r = buildSuggestionsFromAudience(baseArgs);
    expect(r).toHaveLength(3);
    expect(r[0].title).toContain("LLM活用");
  });

  it("includes audience match percentage in rationale", () => {
    const r = buildSuggestionsFromAudience(baseArgs);
    expect(r[0].rationale).toContain("80%");
    expect(r[1].rationale).toContain("50%");
    expect(r[2].rationale).toContain("30%");
  });

  it("excludes categories the organizer has already hosted", () => {
    const r = buildSuggestionsFromAudience({
      ...baseArgs,
      ownCategoryNames: new Set(["LLM活用"]),
    });
    expect(r.find((s) => s.title.includes("LLM活用"))).toBeUndefined();
  });

  it("uses ハンズオン suffix for AI categories", () => {
    const r = buildSuggestionsFromAudience(baseArgs);
    expect(r[0].title).toContain("ハンズオン");
  });

  it("uses ワークショップ suffix for non-AI categories", () => {
    const r = buildSuggestionsFromAudience({
      ...baseArgs,
      audienceCategories: [{ name: "ヨガ", count: 5 }],
      aiCategoryNames: new Set(),
    });
    expect(r[0].title).toContain("ワークショップ");
  });

  it("falls back to defaults when fewer than 3 audience categories", () => {
    const r = buildSuggestionsFromAudience({
      ...baseArgs,
      audienceCategories: [{ name: "LLM活用", count: 8 }],
    });
    expect(r).toHaveLength(3);
    expect(r[0].category_name).toBe("LLM活用");
    expect(r[1].category_name).toBe("AIコミュニティ・座談会");
    expect(r[2].category_name).toBeNull();
  });

  it("returns 2 fallbacks when audience is empty", () => {
    const r = buildSuggestionsFromAudience({
      ...baseArgs,
      audienceCategories: [],
    });
    expect(r).toHaveLength(2); // 全部フォールバック
  });

  it("incorporates dominant level into title", () => {
    const r = buildSuggestionsFromAudience({
      ...baseArgs,
      aiLevelDistribution: { 上級: 10, 中級: 0, 初級: 0 },
    });
    expect(r[0].title).toContain("上級者");
  });

  it("computes audience_match correctly", () => {
    const r = buildSuggestionsFromAudience(baseArgs);
    expect(r[0].audience_match).toBe(0.8);
    expect(r[1].audience_match).toBe(0.5);
    expect(r[2].audience_match).toBe(0.3);
  });

  it("handles participantCount=0 gracefully", () => {
    const r = buildSuggestionsFromAudience({
      ...baseArgs,
      participantCount: 0,
    });
    // 全て 0% match だが crash しない
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].audience_match).toBe(0);
  });

  it("preserves order of audience categories", () => {
    const r = buildSuggestionsFromAudience(baseArgs);
    expect(r.map((s) => s.category_name)).toEqual([
      "LLM活用",
      "画像生成",
      "プロンプトエンジニアリング",
    ]);
  });

  it("excluding ALL audience categories falls fully back", () => {
    const r = buildSuggestionsFromAudience({
      ...baseArgs,
      ownCategoryNames: new Set([
        "LLM活用",
        "画像生成",
        "プロンプトエンジニアリング",
      ]),
    });
    // 全カテゴリが除外され、フォールバックのみ
    expect(r).toHaveLength(2);
    expect(r[0].category_name).toBe("AIコミュニティ・座談会");
  });
});
