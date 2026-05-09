import { describe, it, expect } from "vitest";
import {
  inferAiLevel,
  isAiLegacy,
  AI_CATEGORY_SLUGS,
  aggregateUserHistory,
} from "./user-history";

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

describe("aggregateUserHistory", () => {
  const baseCategoriesMaster = [
    { id: 1, slug: "llm", name: "LLM活用" },
    { id: 2, slug: "image-gen", name: "画像生成" },
    { id: 3, slug: "lifestyle", name: "ライフスタイル" },
    { id: 4, slug: "video-gen", name: "動画生成・編集" },
  ];

  it("returns empty result for no events", () => {
    const r = aggregateUserHistory({
      events: [],
      categoriesMaster: baseCategoriesMaster,
      topicTagAssignments: [],
      topicTags: [],
    });
    expect(r.total_events).toBe(0);
    expect(r.ai_event_count).toBe(0);
    expect(r.ai_level).toBe("未参加");
    expect(r.by_category).toEqual([]);
  });

  it("counts events by category and identifies AI vs lifestyle", () => {
    const r = aggregateUserHistory({
      events: [
        {
          id: "e1",
          title: "LLM入門",
          datetime: "2026-04-01T10:00:00Z",
          category: null,
          category_id: 1,
        },
        {
          id: "e2",
          title: "ヨガ",
          datetime: "2026-04-05T10:00:00Z",
          category: null,
          category_id: 3,
        },
      ],
      categoriesMaster: baseCategoriesMaster,
      topicTagAssignments: [],
      topicTags: [],
    });
    expect(r.total_events).toBe(2);
    expect(r.ai_event_count).toBe(1); // LLM活用 is AI
    expect(r.by_category.length).toBe(2);
  });

  it("uses legacy category text when category_id is null", () => {
    const r = aggregateUserHistory({
      events: [
        {
          id: "e1",
          title: "AI勉強会",
          datetime: "2026-04-01T10:00:00Z",
          category: "AI勉強会",
          category_id: null,
        },
      ],
      categoriesMaster: baseCategoriesMaster,
      topicTagAssignments: [],
      topicTags: [],
    });
    expect(r.ai_event_count).toBe(1); // matched legacy regex
    expect(r.by_category[0].name).toBe("AI勉強会");
  });

  it("recommends AI categories not yet attended", () => {
    const r = aggregateUserHistory({
      events: [
        {
          id: "e1",
          title: "LLM",
          datetime: "2026-04-01T10:00:00Z",
          category: null,
          category_id: 1, // llm
        },
      ],
      categoriesMaster: baseCategoriesMaster,
      topicTagAssignments: [],
      topicTags: [],
    });
    // recommendations should include image-gen and video-gen (other AI cats), not llm
    const slugs = r.recommended_next.map((c) => c.name);
    expect(slugs).toContain("画像生成");
    expect(slugs).toContain("動画生成・編集");
    expect(slugs).not.toContain("LLM活用");
  });

  it("sorts recent_events by datetime descending", () => {
    const r = aggregateUserHistory({
      events: [
        { id: "old", title: "旧", datetime: "2025-01-01", category: null, category_id: 1 },
        { id: "new", title: "新", datetime: "2026-04-01", category: null, category_id: 1 },
        { id: "mid", title: "中", datetime: "2025-06-01", category: null, category_id: 1 },
      ],
      categoriesMaster: baseCategoriesMaster,
      topicTagAssignments: [],
      topicTags: [],
    });
    expect(r.recent_events.map((e) => e.id)).toEqual(["new", "mid", "old"]);
  });

  it("aggregates topic tags only (filters by tag_type)", () => {
    const r = aggregateUserHistory({
      events: [
        { id: "e1", title: "ev1", datetime: "2026-04-01", category: null, category_id: 1 },
      ],
      categoriesMaster: baseCategoriesMaster,
      topicTagAssignments: [
        { event_id: "e1", tag_id: 100 },
        { event_id: "e1", tag_id: 200 },
        { event_id: "e1", tag_id: 300 },
      ],
      topicTags: [
        { id: 100, name: "RAG", tag_type: "topic" },
        { id: 200, name: "オンライン", tag_type: "format" }, // not topic
        { id: 300, name: "ChatGPT", tag_type: "tool" }, // not topic
      ],
    });
    // 100 is topic, 200/300 are not
    expect(r.by_tag_topic.length).toBe(1);
    expect(r.by_tag_topic[0].name).toBe("RAG");
  });

  it("computes correct AI level based on event count + domain spread", () => {
    const events = Array.from({ length: 4 }, (_, i) => ({
      id: `e${i}`,
      title: "x",
      datetime: "2026-04-01",
      category: null,
      category_id: ((i % 2) + 1) as number, // alternates between LLM and image-gen
    }));
    const r = aggregateUserHistory({
      events,
      categoriesMaster: baseCategoriesMaster,
      topicTagAssignments: [],
      topicTags: [],
    });
    // 4 AI events, 2 distinct domains → 初級
    expect(r.ai_event_count).toBe(4);
    expect(r.ai_distinct_domains).toBe(2);
    expect(r.ai_level).toBe("初級");
  });

  it("limits by_category to top 8", () => {
    const events = Array.from({ length: 20 }, (_, i) => ({
      id: `e${i}`,
      title: "x",
      datetime: "2026-04-01",
      category: `Category-${i}`,
      category_id: null,
    }));
    const r = aggregateUserHistory({
      events,
      categoriesMaster: [],
      topicTagAssignments: [],
      topicTags: [],
    });
    expect(r.by_category.length).toBe(8);
  });
});
