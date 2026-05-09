/**
 * 敵対的テスト：「壊れるはず」のケースを探す
 *
 * 通常のテストは仕様通り動くか確認する。
 * adversarial test は変な入力・極端値・並行性・タイミング攻撃などを
 * わざと食わせて、隠れたバグを掘り出す。
 */
import { describe, it, expect } from "vitest";
import { calcApplicationFee } from "./stripe-connect";
import { inferAiLevel } from "./user-history";
import { bucket, shortenReferrer, aggregateViews } from "./analytics";
import { calculateEventScore, type ScoringContext, type ScoringEvent } from "./feed";
import { fillTemplate, wrapInHtml } from "./email-templates";
import { generateShortCode } from "./short-code";

// ─── Adversarial: calcApplicationFee ──────────────────────────
describe("[ADVERSARIAL] calcApplicationFee の脆弱性検出", () => {
  it("BUG?: NaN入力でNaNを返してしまわないか", () => {
    const result = calcApplicationFee(NaN, 5, 0);
    // 仕様としては return 0 or throw が望ましい
    // 現状 implementation は NaN を返す可能性あり
    expect(Number.isNaN(result)).toBe(true); // 現状を記録
    // 改善後: expect(result).toBe(0) になるべき
  });

  it("BUG?: 負の金額（返金額）でも負の手数料を返してしまう", () => {
    // 返金処理では本来 application_fee も refund する必要がある
    // 直接 -10000 を入れると -500 を返す → 設計上意図しない
    const result = calcApplicationFee(-10000, 5, 0);
    expect(result).toBe(-500); // 現状
    // 改善後: max(0, ...) でガードすべき
  });

  it("BUG?: Infinity 入力", () => {
    expect(calcApplicationFee(Infinity, 5, 0)).toBe(Infinity);
    // 入金が無限大などあり得ない、Infinity チェックすべき
  });

  it("極小額 ¥1 の決済では手数料 0 円（百分率丸め）", () => {
    // 1 * 5 / 100 = 0.05 → floor = 0
    // 主催者には ¥1 入金、プラットフォームには ¥0 → 設計通りだが事実上手数料無料
    expect(calcApplicationFee(1, 5, 0)).toBe(0);
  });

  it("¥19 までは 5% 手数料が 0 円（丸めバグ的挙動）", () => {
    // 5% で ¥1 になるのは ¥20 から
    for (let i = 1; i <= 19; i++) {
      expect(calcApplicationFee(i, 5, 0)).toBe(0);
    }
    expect(calcApplicationFee(20, 5, 0)).toBe(1);
  });
});

// ─── Adversarial: inferAiLevel ───────────────────────────────
describe("[ADVERSARIAL] inferAiLevel の境界バグ検出", () => {
  it("FIXED: 負の event count → 未参加（防御済み）", () => {
    // 改善前: 入門 を返していた（aiEventCount === 0 のみ未参加扱い）
    // 改善後: !Number.isFinite || <= 0 を 未参加 として扱う
    expect(inferAiLevel(-1, 0)).toBe("未参加");
    expect(inferAiLevel(-100, 5)).toBe("未参加");
  });

  it("event_count > distinct_domains は不変条件のはず", () => {
    // domains は events のサブセット → domains > events はあり得ない
    // でも関数は防御していない
    const result = inferAiLevel(1, 100); // 異常: 1イベントで100ドメイン
    // 現状 result は 入門 (1-2件枠)
    // しかし business logic 的には domains >= events はバグ的入力
    expect(result).toBe("入門");
  });

  it("FIXED: NaN / -Infinity も 未参加 に縮退", () => {
    expect(inferAiLevel(NaN, NaN)).toBe("未参加");
    expect(inferAiLevel(-Infinity, 0)).toBe("未参加");
  });

  it("FIXED: Infinity も 未参加 に縮退（!Number.isFinite ガード）", () => {
    expect(inferAiLevel(Infinity, 0)).toBe("未参加");
  });
});

// ─── Adversarial: bucket ─────────────────────────────────────
describe("[ADVERSARIAL] bucket の罠", () => {
  it("空文字列は入力対象になるか", () => {
    // bucket は !v でフィルタしているので "" は除外される（仕様）
    const r = bucket(["", "", "a"]);
    expect(r).toEqual([{ source: "a", count: 1 }]);
  });

  it("数字文字列・特殊キーが衝突しない", () => {
    // "constructor", "__proto__", "toString" など Object prototype汚染
    const r = bucket(["constructor", "__proto__", "toString"]);
    expect(r.length).toBeGreaterThanOrEqual(1);
    // 特殊キーで Object.create({}) ベースに統一しているか
  });

  it("極端に大きい入力（10000件）でも crash しない", () => {
    const arr = Array.from({ length: 10000 }, (_, i) => `s${i % 100}`);
    expect(() => bucket(arr)).not.toThrow();
    const r = bucket(arr);
    // top 8 まで
    expect(r.length).toBe(8);
  });
});

// ─── Adversarial: shortenReferrer ────────────────────────────
describe("[ADVERSARIAL] shortenReferrer の URL parsing", () => {
  it("data URLs は破壊しない", () => {
    const r = shortenReferrer("data:text/html,<script>alert(1)</script>");
    // URL parser は data: スキームをパースする
    // hostname は空文字列を返す可能性 → 何が返るか確認
    expect(r).toBeTypeOf("string");
  });

  it("javascript: URL", () => {
    const r = shortenReferrer("javascript:alert(1)");
    expect(r).toBeTypeOf("string");
  });

  it("極端に長いURL（DoS試行）", () => {
    const long = "https://" + "a".repeat(10000) + ".com/" + "x".repeat(10000);
    expect(() => shortenReferrer(long)).not.toThrow();
  });

  it("RTL特殊文字を含む", () => {
    const r = shortenReferrer("https://example.com/\u202E");
    expect(r).toBe("example.com");
  });
});

// ─── Adversarial: aggregateViews ─────────────────────────────
describe("[ADVERSARIAL] aggregateViews の統計バグ", () => {
  it("bookings が undefined っぽい異常値（status空文字列等）", () => {
    const r = aggregateViews([], [
      { status: "" },
      { status: "weird-status" },
      { status: "CONFIRMED" }, // 大文字違い - 集計から漏れる
    ]);
    // 現状: status === "confirmed" でしか集計しないので大文字は漏れる
    expect(r.bookings_confirmed).toBe(0); // 大文字は無視される
  });

  it("viewed_at の不正フォーマットでも crash しない", () => {
    const v = (viewed_at: string) => ({
      user_id: null,
      anon_id: null,
      referrer: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      viewed_at,
    });
    const r = aggregateViews(
      [
        v(""),       // 空文字列
        v("invalid"), // 無効
        v("2026-05-01T10:00:00Z"),
      ],
      []
    );
    // slice(0,10) が "invalid" -> "invalid" として日として扱われる
    // 「日別集計」が壊れる可能性
    expect(r.total_views).toBe(3);
    // views_by_day には "" や "invalid"[0:10] が混在しうる
    const days = r.views_by_day.map((d) => d.date);
    // 異常データが日付として残る = データ品質バグ
    expect(days.length).toBeGreaterThan(0);
  });

  it("user_id == anon_id が衝突しない（別人を同一視しない）", () => {
    const v = (overrides: Record<string, unknown>) =>
      ({
        user_id: null,
        anon_id: null,
        referrer: null,
        utm_source: null,
        utm_medium: null,
        utm_campaign: null,
        viewed_at: "2026-05-01T10:00:00Z",
        ...overrides,
      } as Parameters<typeof aggregateViews>[0][number]);
    // user_id="abc" と anon_id="abc" は別人のはずだが、Set のキーが
    // 単純な文字列なので衝突する → BUG
    const r = aggregateViews(
      [v({ user_id: "abc" }), v({ anon_id: "abc" })],
      []
    );
    // 期待: 2 unique（別人）
    // 現状: 1 unique（衝突）
    expect(r.unique_views).toBe(1); // バグを記録 — 改善が必要
  });
});

// ─── Adversarial: calculateEventScore ────────────────────────
describe("[ADVERSARIAL] calculateEventScore の数値挙動", () => {
  const NOW = Date.now();
  const ctx: ScoringContext = {
    interestTagIds: new Set(),
    followingOrgIds: new Set(),
    viewedEventIds: new Set(),
    attendedCategoryIds: new Set(),
    isLoggedIn: true,
    now: NOW,
  };

  it("invalid datetime（new Date('garbage')）でNaNが伝播しないか", () => {
    const event: ScoringEvent = {
      id: "x",
      datetime: "garbage", // Invalid Date → getTime() は NaN
      capacity: 10,
      is_limited: false,
      creator_id: null,
      category_id: null,
      tagIds: [],
      bookingCount: 0,
    };
    const r = calculateEventScore(event, ctx);
    // NaN - now → NaN, NaN/86400000 → NaN, NaN >= 0 → false
    // → recency 寄与なし、score は novelty のみ
    expect(Number.isFinite(r.score)).toBe(true);
  });

  it("bookingCount > capacity（オーバーブッキング状態）", () => {
    const event: ScoringEvent = {
      id: "x",
      datetime: new Date(NOW + 86400000).toISOString(),
      capacity: 10,
      is_limited: false,
      creator_id: null,
      category_id: null,
      tagIds: [],
      bookingCount: 15, // capacity超過 (本来は無いが)
    };
    const r = calculateEventScore(event, ctx);
    // fill = 1.5 → popScore = 1-(0.6*5) = -2 → max(0, -2) = 0
    // 防御済み（max(0, ...) のおかげ）
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it("BUG?: capacity が負（不正データ）", () => {
    const event: ScoringEvent = {
      id: "x",
      datetime: new Date(NOW + 86400000).toISOString(),
      capacity: -10, // 異常値
      is_limited: false,
      creator_id: null,
      category_id: null,
      tagIds: [],
      bookingCount: 5,
    };
    const r = calculateEventScore(event, ctx);
    // cap=-10, fill = 5/-10 = -0.5
    // popScore: fill < 0.9 → fill (-0.5)
    // max(0, -0.5) = 0
    // 防御済み
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.score)).toBe(true);
  });
});

// ─── Adversarial: fillTemplate ──────────────────────────────
describe("[ADVERSARIAL] fillTemplate のセキュリティ", () => {
  it("FIXED: 連鎖置換による placeholder injection 防止", () => {
    // 改善前: .replace を連続呼び出し → 1回目の出力 ({eventDate}) が
    //   2回目で再展開され、ユーザー由来値が他フィールドに化ける
    // 改善後: 単一パスで置換 → 値の中の placeholder はそのまま残る
    const r = fillTemplate("{eventTitle}", {
      eventTitle: "{eventDate}",
      eventDate: "DATE",
      eventLocation: "",
      eventUrl: "",
    });
    expect(r).toBe("{eventDate}"); // 再帰しない（修正済み）
  });

  it("HTML を値として渡すとそのまま埋め込まれる（XSS可能性）", () => {
    const r = fillTemplate("{eventTitle}", {
      eventTitle: "<script>alert(1)</script>",
      eventDate: "",
      eventLocation: "",
      eventUrl: "",
    });
    // fillTemplate は escape しない！
    // wrapInHtml で escape される設計なら OK だが、
    // メール本文の textBody として送ったら危険
    expect(r).toContain("<script>");
    // → fillTemplate 単体ではエスケープしないことを記録。
    //   実装上は wrapInHtml(escape) を必ず通す責任がある。
  });
});

// ─── Adversarial: wrapInHtml ────────────────────────────────
describe("[ADVERSARIAL] wrapInHtml のXSS耐性", () => {
  it("script タグは確実にエスケープされる", () => {
    const html = wrapInHtml("<script>steal()</script>", "title");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("複数の特殊文字が混在 — body部だけ escape されていれば OK（HTML wrapper構造の <html>/<body> は当然残る）", () => {
    const html = wrapInHtml("A & B < C & D > E", "title");
    // body 内の特殊文字が escape されているか
    expect(html).toContain("A &amp; B &lt; C &amp; D &gt; E");
    // wrapper の <html>/<body> は残る（テンプレ自体はサーバ生成で安全）
    expect(html).toContain("<html");
    expect(html).toContain("<body");
  });

  it("VERIFIED SAFE: eventTitle も正しくエスケープされる", () => {
    const html = wrapInHtml("body", "<script>xss</script>");
    // 実装は escape している → script タグはそのままでは現れない
    expect(html).not.toContain("<script>xss</script>");
    expect(html).toContain("&lt;script&gt;xss&lt;/script&gt;");
  });
});

// ─── Adversarial: generateShortCode ─────────────────────────
describe("[ADVERSARIAL] generateShortCode の偏り", () => {
  it("出力分布のバイアスチェック", () => {
    const counts: Record<string, number> = {};
    const SAMPLES = 100;
    for (let i = 0; i < SAMPLES; i++) {
      const code = generateShortCode(1);
      counts[code] = (counts[code] ?? 0) + 1;
    }
    // 62文字から1文字選択 → 100サンプルで均等なら平均1.6回
    // 統計的に偏りが大きいと bytes[i] % 62 のmodulo bias の可能性
    const used = Object.keys(counts).length;
    // 100サンプルで62文字中の何文字が出るか → 通常50以上
    expect(used).toBeGreaterThan(30);
  });

  it("length=0 を渡すとどうなるか", () => {
    expect(generateShortCode(0)).toBe("");
  });

  it("極端に大きい length", () => {
    const code = generateShortCode(1000);
    expect(code.length).toBe(1000);
    expect(code).toMatch(/^[A-Za-z0-9]{1000}$/);
  });
});
