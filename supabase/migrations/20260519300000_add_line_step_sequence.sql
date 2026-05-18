-- ============================================================
-- LINE ステップ配信
-- ============================================================
-- 主催者ごとに「申込から N 時間後に X メッセージを自動送信」という
-- ステップ配信シナリオを1つ設定できる。
-- 申込者本人がLINE紐付け済み（bookings.line_user_id）の場合に push する。
-- 主催者のすべての公開イベントに自動適用される（MVP）。
-- ============================================================

-- ─── line_step_sequences: シナリオ本体（user に1つ） ─────────
CREATE TABLE IF NOT EXISTS public.line_step_sequences (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null unique references public.profiles(id) on delete cascade,
  name        text        not null default 'デフォルトシナリオ',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

COMMENT ON TABLE public.line_step_sequences IS
  '主催者ごとのステップ配信シナリオ（MVP: 1ユーザー1シナリオ）';

-- ─── line_step_messages: 各ステップ ─────────────────────────
CREATE TABLE IF NOT EXISTS public.line_step_messages (
  id            uuid        primary key default gen_random_uuid(),
  sequence_id   uuid        not null references public.line_step_sequences(id) on delete cascade,
  offset_hours  integer     not null check (offset_hours >= 0),
  body          text        not null,
  sort_order    integer     not null default 0,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

COMMENT ON TABLE public.line_step_messages IS
  'ステップ配信の各メッセージ。offset_hours は申込（bookings.created_at）からの経過時間';
COMMENT ON COLUMN public.line_step_messages.offset_hours IS
  '申込からの経過時間（例: 24=申込1日後、168=1週間後）';

CREATE INDEX IF NOT EXISTS idx_line_step_messages_sequence_id
  ON public.line_step_messages(sequence_id);

-- ─── line_step_sends: 配信ログ + 二重送信防止 ────────────────
CREATE TABLE IF NOT EXISTS public.line_step_sends (
  id                uuid        primary key default gen_random_uuid(),
  booking_id        uuid        not null references public.bookings(id) on delete cascade,
  step_message_id   uuid        not null references public.line_step_messages(id) on delete cascade,
  sent_at           timestamptz not null default now(),
  ok                boolean     not null default true,
  error             text,
  UNIQUE(booking_id, step_message_id)
);

COMMENT ON TABLE public.line_step_sends IS
  'ステップメッセージの配信実績。(booking_id, step_message_id) で二重送信防止';

CREATE INDEX IF NOT EXISTS idx_line_step_sends_booking_id
  ON public.line_step_sends(booking_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_update_line_step_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_line_step_sequences_updated_at ON public.line_step_sequences;
CREATE TRIGGER trg_line_step_sequences_updated_at
  BEFORE UPDATE ON public.line_step_sequences
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_line_step_updated_at();

DROP TRIGGER IF EXISTS trg_line_step_messages_updated_at ON public.line_step_messages;
CREATE TRIGGER trg_line_step_messages_updated_at
  BEFORE UPDATE ON public.line_step_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_line_step_updated_at();

-- ─── RLS: 本人のみ操作可 ────────────────────────────────────
ALTER TABLE public.line_step_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_step_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_step_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "step_seq_select_own" ON public.line_step_sequences;
CREATE POLICY "step_seq_select_own"
  ON public.line_step_sequences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "step_seq_insert_own" ON public.line_step_sequences;
CREATE POLICY "step_seq_insert_own"
  ON public.line_step_sequences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "step_seq_update_own" ON public.line_step_sequences;
CREATE POLICY "step_seq_update_own"
  ON public.line_step_sequences FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "step_seq_delete_own" ON public.line_step_sequences;
CREATE POLICY "step_seq_delete_own"
  ON public.line_step_sequences FOR DELETE USING (auth.uid() = user_id);

-- step_messages: シーケンスの所有者のみ
DROP POLICY IF EXISTS "step_msgs_select_own" ON public.line_step_messages;
CREATE POLICY "step_msgs_select_own"
  ON public.line_step_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.line_step_sequences s
            WHERE s.id = line_step_messages.sequence_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "step_msgs_insert_own" ON public.line_step_messages;
CREATE POLICY "step_msgs_insert_own"
  ON public.line_step_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.line_step_sequences s
            WHERE s.id = line_step_messages.sequence_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "step_msgs_update_own" ON public.line_step_messages;
CREATE POLICY "step_msgs_update_own"
  ON public.line_step_messages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.line_step_sequences s
            WHERE s.id = line_step_messages.sequence_id AND s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "step_msgs_delete_own" ON public.line_step_messages;
CREATE POLICY "step_msgs_delete_own"
  ON public.line_step_messages FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.line_step_sequences s
            WHERE s.id = line_step_messages.sequence_id AND s.user_id = auth.uid())
  );
