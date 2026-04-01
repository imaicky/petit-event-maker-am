-- ─── Menus table ──────────────────────────────────────────────
create table if not exists public.menus (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  price integer not null default 0,
  price_note text,
  image_url text,
  capacity integer,
  custom_fields jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  slug text unique not null,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists menus_creator_id_idx on public.menus(creator_id);
create index if not exists menus_slug_idx on public.menus(slug);
create index if not exists menus_is_published_idx on public.menus(is_published);

-- RLS
alter table public.menus enable row level security;

drop policy if exists "Anyone can view published menus" on public.menus;
create policy "Anyone can view published menus"
  on public.menus for select
  using (is_published = true);

drop policy if exists "Creators can view own menus" on public.menus;
create policy "Creators can view own menus"
  on public.menus for select
  using (auth.uid() = creator_id);

drop policy if exists "Creators can insert own menus" on public.menus;
create policy "Creators can insert own menus"
  on public.menus for insert
  with check (auth.uid() = creator_id);

drop policy if exists "Creators can update own menus" on public.menus;
create policy "Creators can update own menus"
  on public.menus for update
  using (auth.uid() = creator_id);

drop policy if exists "Creators can delete own menus" on public.menus;
create policy "Creators can delete own menus"
  on public.menus for delete
  using (auth.uid() = creator_id);

-- Updated_at trigger
create or replace function public.update_menus_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists menus_updated_at on public.menus;
create trigger menus_updated_at
  before update on public.menus
  for each row
  execute function public.update_menus_updated_at();

-- ─── Menu bookings table ─────────────────────────────────────
create table if not exists public.menu_bookings (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid references public.menus(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  custom_field_values jsonb not null default '{}'::jsonb,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists menu_bookings_menu_id_idx on public.menu_bookings(menu_id);
create index if not exists menu_bookings_status_idx on public.menu_bookings(status);

-- RLS
alter table public.menu_bookings enable row level security;

drop policy if exists "Anyone can create menu bookings" on public.menu_bookings;
create policy "Anyone can create menu bookings"
  on public.menu_bookings for insert
  with check (true);

drop policy if exists "Menu creators can view bookings" on public.menu_bookings;
create policy "Menu creators can view bookings"
  on public.menu_bookings for select
  using (
    exists (
      select 1 from public.menus
      where menus.id = menu_bookings.menu_id
        and menus.creator_id = auth.uid()
    )
  );

drop policy if exists "Bookers can view own bookings" on public.menu_bookings;
create policy "Bookers can view own bookings"
  on public.menu_bookings for select
  using (user_id = auth.uid());
