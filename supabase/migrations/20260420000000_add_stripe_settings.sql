-- Stripe settings per user (same pattern as line_accounts)
create table if not exists public.stripe_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_account_id text,           -- acct_xxx (display only)
  stripe_secret_key text not null,  -- sk_test_... / sk_live_...
  stripe_webhook_id text,           -- we_xxx (for deletion)
  stripe_webhook_secret text,       -- whsec_xxx (signature verification)
  display_name text not null default '',
  is_test_mode boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_settings_user_id_key unique (user_id)
);

-- RLS
alter table public.stripe_settings enable row level security;

create policy "Users can view own stripe settings"
  on public.stripe_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own stripe settings"
  on public.stripe_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own stripe settings"
  on public.stripe_settings for update
  using (auth.uid() = user_id);

create policy "Users can delete own stripe settings"
  on public.stripe_settings for delete
  using (auth.uid() = user_id);

-- Service role needs full access for webhook route lookups
create policy "Service role full access on stripe_settings"
  on public.stripe_settings for all
  using (auth.role() = 'service_role');
