-- ============================================================
-- hybrid イベント: 参加形式別の定員管理 Phase 2（Issue #5）
-- ============================================================
-- 既存 events.capacity は引き続き「全体定員」として温存。
-- hybrid 開催時のみ、capacity_physical + capacity_online を
-- 使って形式別の容量チェック・waitlist振り分けを行う。
--
-- 非hybrid（physical / online）イベントでは新カラムは NULL で運用。
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS capacity_physical int
    CHECK (capacity_physical IS NULL OR capacity_physical >= 0),
  ADD COLUMN IF NOT EXISTS capacity_online int
    CHECK (capacity_online IS NULL OR capacity_online >= 0);

-- 既存 hybrid イベントは全枠を physical に振る（暫定）。
-- 主催者が編集画面で調整できるように、online は NULL のままにする
-- （NULL = 設定未済 ⇒ 0扱いで online 予約を拒否、と扱う運用）。
UPDATE public.events
   SET capacity_physical = capacity
 WHERE location_type = 'hybrid'
   AND capacity_physical IS NULL
   AND capacity IS NOT NULL;
