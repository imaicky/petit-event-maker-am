-- event_admins: 共同管理者テーブル
CREATE TABLE public.event_admins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email       text,
  invite_token text UNIQUE,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, email)
);

-- Index for faster lookups
CREATE INDEX idx_event_admins_event_id ON public.event_admins(event_id);
CREATE INDEX idx_event_admins_user_id ON public.event_admins(user_id);
CREATE INDEX idx_event_admins_invite_token ON public.event_admins(invite_token);

-- RLS
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;

-- SELECT: creator or admins of the event
CREATE POLICY "event_admins_select" ON public.event_admins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_admins.event_id
        AND e.creator_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- INSERT: only the event creator
CREATE POLICY "event_admins_insert" ON public.event_admins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_admins.event_id
        AND e.creator_id = auth.uid()
    )
  );

-- UPDATE: event creator (for accepting invites, the API uses admin client)
CREATE POLICY "event_admins_update" ON public.event_admins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_admins.event_id
        AND e.creator_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- DELETE: only the event creator
CREATE POLICY "event_admins_delete" ON public.event_admins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_admins.event_id
        AND e.creator_id = auth.uid()
    )
  );
