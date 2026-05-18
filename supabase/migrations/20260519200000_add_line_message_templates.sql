-- ============================================================
-- LINE メッセージテンプレート
-- ============================================================
-- 主催者がよく使うメッセージを保存して、LINE通知ダイアログから
-- 呼び出して使えるようにする。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.line_message_templates (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  name        text        not null,
  body        text        not null,
  sort_order  integer     not null default 0,
  use_count   integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

COMMENT ON TABLE public.line_message_templates IS
  'LINE通知ダイアログから呼び出せる主催者ごとのテンプレート';
COMMENT ON COLUMN public.line_message_templates.name IS 'テンプレ名（一覧に表示）';
COMMENT ON COLUMN public.line_message_templates.body IS '本文（500字以内推奨）';
COMMENT ON COLUMN public.line_message_templates.use_count IS '使用回数（よく使う順並べ替え用）';

CREATE INDEX IF NOT EXISTS idx_line_message_templates_user_id
  ON public.line_message_templates(user_id);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.tg_update_line_message_templates_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_line_message_templates_updated_at ON public.line_message_templates;
CREATE TRIGGER trg_line_message_templates_updated_at
  BEFORE UPDATE ON public.line_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_line_message_templates_updated_at();

-- RLS: 本人のみ操作可
ALTER TABLE public.line_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_own" ON public.line_message_templates;
CREATE POLICY "templates_select_own"
  ON public.line_message_templates FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "templates_insert_own" ON public.line_message_templates;
CREATE POLICY "templates_insert_own"
  ON public.line_message_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "templates_update_own" ON public.line_message_templates;
CREATE POLICY "templates_update_own"
  ON public.line_message_templates FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "templates_delete_own" ON public.line_message_templates;
CREATE POLICY "templates_delete_own"
  ON public.line_message_templates FOR DELETE
  USING (auth.uid() = user_id);
