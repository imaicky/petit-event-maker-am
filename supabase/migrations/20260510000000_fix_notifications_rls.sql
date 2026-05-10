-- Fix notifications RLS policies that reference auth.users (causes 42501 for anon clients)
-- Use auth.jwt()->>'email' instead, which reads from JWT without needing auth schema access.

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;

create policy "notifications_select_own"
  on public.notifications for select
  using (
    lower(recipient_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create policy "notifications_update_own"
  on public.notifications for update
  using (
    lower(recipient_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
