import { describe, it, expect } from "vitest";
import {
  calculateEventScore,
  FEED_WEIGHTS,
  MAX_FEED_SIZE,
  type ScoringContext,
  type ScoringEvent,
} from "./feed";

const NOW = new Date("2026-06-01T00:00:00Z").getTime();

const baseCtx: ScoringContext = {
  interestTagIds: new Set(),
  followingOrgIds: new Set(),
  viewedEventIds: new Set(),
  attendedCategoryIds: new Set(),
  isLoggedIn: true,
  now: NOW,
};

const baseEvent: ScoringEvent = {
  id: "evt-1",
  datetime: new Date(NOW + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7日後
  capacity: 10,
  is_limited: false,
  creator_id: "org-1",
  category_id: 1,
  tagIds: [10, 20, 30],
  bookingCount: 0,
};

describe("calculateEventScore - タグマッチ", () => {
  it("興味タグが1件マッチで部分点", () => {
    const ctx = { ...baseCtx, interestTagIds: new Set([10]) };
    const r = calculateEventScore(baseEvent, ctx);
    // tagMatch = 1/3 = 0.33
    // score includes recency contribution as well
    expect(r.reasons).toContain("興味タグ1件マッチ");
    expect(r.score).toBeGreaterThan(0);
  });

  it("3件マッチで満点（タグマッチ部分）", () => {
    const ctx = { ...baseCtx, interestTagIds: new Set([10, 20, 30]) };
    const r = calculateEventScore(baseEvent, ctx);
    expect(r.reasons).toContain("興味タグ3件マッチ");
    // tagMatch = min(1, 3/3) = 1.0
    // score >= 0.4 (tagMatch contribution) + recency contribution
    expect(r.score).toBeGreaterThanOrEqual(FEED_WEIGHTS.tagMatch);
  });

  it("4件以上マッチでも上限1.0で頭打ち", () => {
    const event = { ...baseEvent, tagIds: [10, 20, 30, 40, 50] };
    const ctx = {
      ...baseCtx,
      interestTagIds: new Set([10, 20, 30, 40, 50]),
    };
    const r = calculateEventScore(event, ctx);
    expect(r.reasons[0]).toContain("5件マッチ");
    // tagMatch capped at 1.0
    expect(r.score).toBeLessThanOrEqual(1.0);
  });

  it("マッチなし & 過去カテゴリ一致でフォールバック", () => {
    const ctx = {
      ...baseCtx,
      attendedCategoryIds: new Set([1]),
    };
    const r = calculateEventScore(baseEvent, ctx);
    expect(r.reasons).toContain("過去参加カテゴリ");
    // tagMatch = 0.6
    expect(r.score).toBeGreaterThan(FEED_WEIGHTS.tagMatch * 0.5);
  });
});

describe("calculateEventScore - フォローブースト", () => {
  it("フォロー中の主催者ならboostがつく", () => {
    const ctx = {
      ...baseCtx,
      followingOrgIds: new Set(["org-1"]),
    };
    const r = calculateEventScore(baseEvent, ctx);
    expect(r.reasons).toContain("フォロー中の主催者");
  });

  it("フォローしていなければboost無し", () => {
    const r = calculateEventScore(baseEvent, baseCtx);
    expect(r.reasons).not.toContain("フォロー中の主催者");
  });

  it("creator_idがnullなら絶対にboostつかない", () => {
    const event = { ...baseEvent, creator_id: null };
    const ctx = {
      ...baseCtx,
      followingOrgIds: new Set(["org-1"]),
    };
    const r = calculateEventScore(event, ctx);
    expect(r.reasons).not.toContain("フォロー中の主催者");
  });
});

describe("calculateEventScore - 人気度", () => {
  it("予約fill rate 0%だとpopularity=0", () => {
    const event = { ...baseEvent, bookingCount: 0, capacity: 10 };
    const r = calculateEventScore(event, baseCtx);
    expect(r.reasons).not.toContain("人気上昇中");
  });

  it("70-89%で「人気上昇中」のシグナル", () => {
    const event = { ...baseEvent, bookingCount: 8, capacity: 10 };
    const r = calculateEventScore(event, baseCtx);
    expect(r.reasons).toContain("人気上昇中");
  });

  it("満員間際は満員リスクで減衰される（fill=1.0 vs fill=0.9）", () => {
    const event100 = { ...baseEvent, bookingCount: 10, capacity: 10 };
    const event90 = { ...baseEvent, bookingCount: 9, capacity: 10 };
    const r100 = calculateEventScore(event100, baseCtx);
    const r90 = calculateEventScore(event90, baseCtx);
    // 実装: fill < 0.9 ? fill : 1-(fill-0.9)*5
    // fill=0.9 → 1-0=1.0 (peak)
    // fill=1.0 → 1-(0.1)*5=0.5
    // peak は 0.9
    expect(r100.score).toBeLessThan(r90.score);
  });

  it("capacity=0なら人気度に寄与しない（capあり版より低スコア）", () => {
    const eventNoCap = { ...baseEvent, bookingCount: 100, capacity: 0 };
    const eventWithCap = { ...baseEvent, bookingCount: 8, capacity: 10 };
    const rNoCap = calculateEventScore(eventNoCap, baseCtx);
    const rWithCap = calculateEventScore(eventWithCap, baseCtx);
    expect(rNoCap.score).toBeLessThan(rWithCap.score);
  });

  it("capacityがnullでも壊れない", () => {
    const event = { ...baseEvent, capacity: null };
    expect(() => calculateEventScore(event, baseCtx)).not.toThrow();
  });
});

describe("calculateEventScore - 開催日近接", () => {
  it("当日（0日後）でrecency最大", () => {
    const event = {
      ...baseEvent,
      datetime: new Date(NOW).toISOString(),
    };
    const r = calculateEventScore(event, baseCtx);
    // recency = 1
    expect(r.score).toBeGreaterThanOrEqual(FEED_WEIGHTS.recency);
  });

  it("30日後ではrecency成分=0（noveltyのみ残る）", () => {
    const event = {
      ...baseEvent,
      datetime: new Date(NOW + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const r = calculateEventScore(event, baseCtx);
    // recency成分はゼロ、ただしnovelty (0.05) は残る
    expect(r.score).toBeCloseTo(FEED_WEIGHTS.novelty, 2);
  });

  it("過去のイベントはrecency=0（負にならない）", () => {
    const event = {
      ...baseEvent,
      datetime: new Date(NOW - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const ctxLoggedOut = { ...baseCtx, isLoggedIn: false };
    const r = calculateEventScore(event, ctxLoggedOut);
    // recency=0, novelty=0 (logged out), capacity adds nothing (0 bookings)
    expect(r.score).toBe(0);
  });
});

describe("calculateEventScore - 未閲覧ボーナス", () => {
  it("未ログインだとnoveltyつかない", () => {
    const ctx = { ...baseCtx, isLoggedIn: false };
    const r1 = calculateEventScore(baseEvent, ctx);

    const ctxLoggedIn = { ...baseCtx, isLoggedIn: true };
    const r2 = calculateEventScore(baseEvent, ctxLoggedIn);

    expect(r2.score).toBeGreaterThan(r1.score);
  });

  it("既に閲覧済みのイベントはboost無し", () => {
    const ctxViewed = {
      ...baseCtx,
      viewedEventIds: new Set(["evt-1"]),
    };
    const ctxFresh = baseCtx;

    const rViewed = calculateEventScore(baseEvent, ctxViewed);
    const rFresh = calculateEventScore(baseEvent, ctxFresh);

    expect(rFresh.score).toBeGreaterThan(rViewed.score);
  });
});

describe("calculateEventScore - 限定公開除外", () => {
  it("is_limited かつ タグマッチ弱だとscore=0", () => {
    const event = { ...baseEvent, is_limited: true };
    const r = calculateEventScore(event, baseCtx);
    expect(r.score).toBe(0);
  });

  it("is_limited だが強いタグマッチ（>=0.3）なら通す", () => {
    const event = { ...baseEvent, is_limited: true, tagIds: [10] };
    const ctx = { ...baseCtx, interestTagIds: new Set([10]) };
    const r = calculateEventScore(event, ctx);
    // tagMatch = 1/3 = 0.33 >= 0.3 → 通る
    expect(r.score).toBeGreaterThan(0);
  });

  it("is_limited だがフォロー中の主催者だけだとscore=0（タグマッチ不在）", () => {
    const event = { ...baseEvent, is_limited: true };
    const ctx = {
      ...baseCtx,
      followingOrgIds: new Set(["org-1"]),
    };
    const r = calculateEventScore(event, ctx);
    expect(r.score).toBe(0);
  });
});

describe("calculateEventScore - 複合シナリオ", () => {
  it("理想的な高スコアシナリオ", () => {
    const event = {
      ...baseEvent,
      bookingCount: 8, // 80% fill
      datetime: new Date(NOW + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1日後
    };
    const ctx: ScoringContext = {
      interestTagIds: new Set([10, 20, 30]), // 全マッチ
      followingOrgIds: new Set(["org-1"]),
      viewedEventIds: new Set(),
      attendedCategoryIds: new Set(),
      isLoggedIn: true,
      now: NOW,
    };
    const r = calculateEventScore(event, ctx);
    // tag(0.4) + follow(0.25) + recency(~0.145) + pop(~0.12) + novelty(0.05)
    expect(r.score).toBeGreaterThan(0.85);
    expect(r.reasons).toContain("興味タグ3件マッチ");
    expect(r.reasons).toContain("フォロー中の主催者");
    expect(r.reasons).toContain("人気上昇中");
  });

  it("最低スコアシナリオ", () => {
    const event = {
      ...baseEvent,
      datetime: new Date(NOW + 30 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 0,
      bookingCount: 0,
      creator_id: null,
      tagIds: [],
    };
    const ctx = { ...baseCtx, isLoggedIn: false };
    const r = calculateEventScore(event, ctx);
    expect(r.score).toBe(0);
  });
});

describe("FEED_WEIGHTS と MAX_FEED_SIZE 定数", () => {
  it("重みの合計が1.0", () => {
    const sum =
      FEED_WEIGHTS.tagMatch +
      FEED_WEIGHTS.followBoost +
      FEED_WEIGHTS.recency +
      FEED_WEIGHTS.popularity +
      FEED_WEIGHTS.novelty;
    expect(sum).toBeCloseTo(1.0, 2);
  });

  it("MAX_FEED_SIZEは妥当な範囲", () => {
    expect(MAX_FEED_SIZE).toBeGreaterThan(0);
    expect(MAX_FEED_SIZE).toBeLessThanOrEqual(50);
  });
});
