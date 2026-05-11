// ─── hybrid capacity helpers (Issue #5 / Phase 2) ─────────────────
// 形式別の定員管理を扱う pure な小道具。
// - 非hybrid: capacity を一本で運用
// - hybrid:   capacity_physical / capacity_online を分けて運用
//
// 「未設定 = 受け付けない（= 0）」とする方針:
//   hybrid イベントでも、主催者が capacity_online を埋めるまでは
//   オンライン予約を弾く。これは UI に明確なエラーを出すための仕様。

export type FormatCapacity = {
  physical: number | null;
  online: number | null;
};

export type EventForCapacity = {
  location_type: string | null;
  capacity: number | null;
  capacity_physical: number | null;
  capacity_online: number | null;
};

export function isHybrid(event: { location_type: string | null }): boolean {
  return event.location_type === "hybrid";
}

/**
 * イベントの参加形式別の定員を返す。
 * 非hybrid のときは physical 側に総定員を入れる（互換のため）。
 */
export function getFormatCapacity(event: EventForCapacity): FormatCapacity {
  if (isHybrid(event)) {
    return {
      physical: event.capacity_physical,
      online: event.capacity_online,
    };
  }
  // 非hybrid: 既存仕様通り、capacity 一本
  return {
    physical: event.location_type === "online" ? null : event.capacity,
    online: event.location_type === "online" ? event.capacity : null,
  };
}

/**
 * ある参加形式の残席数を計算する。
 * capacity が NULL なら「無制限」とみなして Infinity を返す。
 * capacity が 0 なら 0（その形式の受付なし）。
 */
export function remainingForFormat(
  capacity: number | null,
  confirmedCount: number
): number {
  if (capacity == null) return Infinity;
  return Math.max(0, capacity - confirmedCount);
}

/**
 * 指定した形式での予約が受け付け可能か判定。
 * - 形式の capacity が NULL（無制限）→ 常に true
 * - confirmed + 自分が増える分(=1) が capacity 以下なら true
 */
export function canAcceptBooking(
  capacity: number | null,
  confirmedCount: number
): boolean {
  if (capacity == null) return true;
  return confirmedCount < capacity;
}
