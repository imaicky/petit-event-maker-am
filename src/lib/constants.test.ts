import { describe, it, expect } from "vitest";
import { CATEGORY_ICONS } from "./constants";

describe("CATEGORY_ICONS", () => {
  it("provides icons for all legacy categories", () => {
    const required = [
      "フラワー",
      "ハンドメイド",
      "カメラ",
      "ネイル",
      "占い",
      "ヨガ",
      "Instagram",
      "その他",
    ];
    for (const cat of required) {
      expect(CATEGORY_ICONS[cat]).toBeTruthy();
      expect(typeof CATEGORY_ICONS[cat]).toBe("string");
    }
  });

  it("each icon is a non-empty emoji", () => {
    for (const [name, icon] of Object.entries(CATEGORY_ICONS)) {
      expect(icon.length).toBeGreaterThan(0);
      // category 名は日本語または ASCII
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("returns undefined for unknown category", () => {
    expect(CATEGORY_ICONS["未知のカテゴリ"]).toBeUndefined();
  });
});
