-- ============================================================
-- 複数管理者への LINE 通知対応
-- ============================================================
-- 従来は line_accounts.owner_line_user_id（1件のみ）に通知。
-- 公式アカウントの管理者が複数いる場合に他の管理者に通知が届かない問題を解消する。
-- ============================================================

ALTER TABLE public.line_accounts
  ADD COLUMN IF NOT EXISTS notify_line_user_ids text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.line_accounts.notify_line_user_ids IS
  '予約・決済通知の宛先LINEユーザーID配列。owner_line_user_id をデフォルト含む。';

-- 既存の owner_line_user_id を array に取り込む（重複は避ける）
UPDATE public.line_accounts
   SET notify_line_user_ids =
     CASE
       WHEN owner_line_user_id IS NULL THEN notify_line_user_ids
       WHEN owner_line_user_id = ANY(notify_line_user_ids) THEN notify_line_user_ids
       ELSE array_append(notify_line_user_ids, owner_line_user_id)
     END
 WHERE owner_line_user_id IS NOT NULL;
