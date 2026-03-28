-- ============================================================
-- LINE連携アカウント管理テーブル
-- ============================================================

create table if not exists public.line_accounts (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles(id) on delete cascade,
  channel_name          text        not null default '',
  channel_access_token  text        not null,
  is_active             boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(user_id)
);

-- ─── Indexes ────────────────────────────────────────────────
create index if not exists idx_line_accounts_user_id on public.line_accounts(user_id);

-- ─── updated_at trigger ─────────────────────────────────────
create trigger trg_line_accounts_updated_at
  before update on public.line_accounts
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ─────────────────────────────────────
alter table public.line_accounts enable row level security;

-- Only the owner can read their own LINE account
create policy "line_accounts_select_own"
  on public.line_accounts for select
  using (auth.uid() = user_id);

-- Only the owner can insert their own LINE account
create policy "line_accounts_insert_own"
  on public.line_accounts for insert
  with check (auth.uid() = user_id);

-- Only the owner can update their own LINE account
create policy "line_accounts_update_own"
  on public.line_accounts for update
  using (auth.uid() = user_id);

-- Only the owner can delete their own LINE account
create policy "line_accounts_delete_own"
  on public.line_accounts for delete
  using (auth.uid() = user_id);
