import { describe, it, expect } from "vitest";
import {
  getFormatCapacity,
  remainingForFormat,
  canAcceptBooking,
  isHybrid,
} from "./event-capacity";

describe("isHybrid", () => {
  it("returns true only when location_type === 'hybrid'", () => {
    expect(isHybrid({ location_type: "hybrid" })).toBe(true);
    expect(isHybrid({ location_type: "physical" })).toBe(false);
    expect(isHybrid({ location_type: "online" })).toBe(false);
    expect(isHybrid({ location_type: null })).toBe(false);
  });
});

describe("getFormatCapacity", () => {
  it("hybrid: uses capacity_physical / capacity_online", () => {
    const ev = {
      location_type: "hybrid",
      capacity: 100,
      capacity_physical: 30,
      capacity_online: 50,
    };
    expect(getFormatCapacity(ev)).toEqual({ physical: 30, online: 50 });
  });

  it("hybrid: NULL の側は NULL のまま（未設定）", () => {
    const ev = {
      location_type: "hybrid",
      capacity: 100,
      capacity_physical: 30,
      capacity_online: null,
    };
    expect(getFormatCapacity(ev)).toEqual({ physical: 30, online: null });
  });

  it("physical only: capacity を physical に、online は NULL", () => {
    const ev = {
      location_type: "physical",
      capacity: 20,
      capacity_physical: null,
      capacity_online: null,
    };
    expect(getFormatCapacity(ev)).toEqual({ physical: 20, online: null });
  });

  it("online only: capacity を online に、physical は NULL", () => {
    const ev = {
      location_type: "online",
      capacity: 20,
      capacity_physical: null,
      capacity_online: null,
    };
    expect(getFormatCapacity(ev)).toEqual({ physical: null, online: 20 });
  });
});

describe("remainingForFormat", () => {
  it("capacity NULL は無制限（Infinity）", () => {
    expect(remainingForFormat(null, 10)).toBe(Infinity);
  });

  it("capacity 10、confirmed 3 → 残7", () => {
    expect(remainingForFormat(10, 3)).toBe(7);
  });

  it("満員のときは0", () => {
    expect(remainingForFormat(10, 10)).toBe(0);
  });

  it("超過カウントは0で返す（マイナスを返さない）", () => {
    expect(remainingForFormat(10, 15)).toBe(0);
  });
});

describe("canAcceptBooking", () => {
  it("capacity NULL は常にtrue（無制限）", () => {
    expect(canAcceptBooking(null, 99999)).toBe(true);
  });

  it("空きあり → true", () => {
    expect(canAcceptBooking(10, 5)).toBe(true);
    expect(canAcceptBooking(10, 9)).toBe(true);
  });

  it("満員 → false", () => {
    expect(canAcceptBooking(10, 10)).toBe(false);
    expect(canAcceptBooking(10, 11)).toBe(false);
  });

  it("capacity 0 は常にfalse（その形式は受け付けない）", () => {
    expect(canAcceptBooking(0, 0)).toBe(false);
  });
});
