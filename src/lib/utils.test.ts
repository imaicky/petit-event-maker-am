import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (className merger)", () => {
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters falsy values", () => {
    expect(cn("foo", false, null, undefined, 0, "")).toBe("foo");
  });

  it("handles arrays", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("handles object syntax (clsx)", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("dedupes Tailwind conflicts (twMerge)", () => {
    // last wins for tailwind-merge
    expect(cn("p-2 p-4")).toBe("p-4");
    expect(cn("text-red-500 text-blue-500")).toBe("text-blue-500");
  });

  it("preserves non-conflicting classes", () => {
    expect(cn("text-red-500 bg-blue-100")).toBe("text-red-500 bg-blue-100");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});
