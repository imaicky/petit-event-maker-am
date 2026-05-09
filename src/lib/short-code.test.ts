import { describe, it, expect } from "vitest";
import { generateShortCode } from "./short-code";

describe("generateShortCode", () => {
  it("generates code of default length 6", () => {
    expect(generateShortCode()).toHaveLength(6);
  });

  it("respects custom length", () => {
    expect(generateShortCode(8)).toHaveLength(8);
    expect(generateShortCode(1)).toHaveLength(1);
    expect(generateShortCode(20)).toHaveLength(20);
  });

  it("only contains alphanumeric characters", () => {
    const code = generateShortCode(100);
    expect(code).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("produces high collision-resistance for typical lengths", () => {
    // Generate 1000 codes of length 6 — collisions should be extremely rare
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generateShortCode(6));
    }
    // 62^6 ≈ 56 billion, collisions in 1000 should be 0
    expect(set.size).toBeGreaterThanOrEqual(998);
  });

  it("is non-deterministic across calls", () => {
    const samples = new Set<string>();
    for (let i = 0; i < 20; i++) samples.add(generateShortCode(8));
    // All 20 should be unique
    expect(samples.size).toBe(20);
  });
});
