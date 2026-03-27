-- ============================================================
-- プチイベント作成くん – Supabase Schema
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Tables ──────────────────────────────────────────────────

-- profiles: one row per auth.users row
create table if not exists public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  username      text        not null unique,
  display_name  text,
  avatar_url    text,
  bio           text,
  sns_links     jsonb       default '{}'::jsonb,
  is_teacher    boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- events
create table if not exists public.events (
  id            uuid        primary key default gen_random_uuid(),
  creator_id    uuid        references public.profiles(id) on delete set null,
  title         text        not null,
  description   text,
  datetime      timestamptz not null,
  location      text,
  capacity      integer,
  price         integer     not null default 0,
  image_url     text,
  is_published  boolean     not null default true,
  slug          text        not null unique,
  category      text,
  teacher_name  text,
  teacher_bio   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- bookings
create table if not exists public.bookings (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references public.events(id) on delete cascade,
  user_id       uuid        references public.profiles(id) on delete set null,
  guest_name    text        not null,
  guest_email   text        not null,
  guest_phone   text,
  status        text        not null default 'confirmed'
                            check (status in ('confirmed', 'cancelled')),
  created_at    timestamptz not null default now()
);

-- reviews
create table if not exists public.reviews (
  id            uuid        primary key default gen_random_uuid(),
  event_id      uuid        not null references public.events(id) on delete cascade,
  reviewer_name text        not null,
  rating        integer     not null check (rating between 1 and 5),
  comment       text        not null,
  created_at    timestamptz not null default now()
);

-- notifications
create table if not exists public.notifications (
  id              uuid        primary key default gen_random_uuid(),
  recipient_email text        not null,
  type            text        not null,
  subject         text        not null,
  body            text        not null,
  is_read         boolean     not null default false,
  created_at      timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────

create index if not exists idx_events_creator_id    on public.events(creator_id);
create index if not exists idx_events_slug          on public.events(slug);
create index if not exists idx_events_datetime      on public.events(datetime);
create index if not exists idx_events_is_published  on public.events(is_published);

create index if not exists idx_bookings_event_id    on public.bookings(event_id);
create index if not exists idx_bookings_user_id     on public.bookings(user_id);
create index if not exists idx_bookings_guest_email on public.bookings(guest_email);

create index if not exists idx_reviews_event_id     on public.reviews(event_id);

create index if not exists idx_notifications_email  on public.notifications(recipient_email);
create index if not exists idx_notifications_is_read on public.notifications(is_read);

-- ─── updated_at trigger ──────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ─── Auto-create profile on auth.users insert ────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix         int := 0;
begin
  -- derive a username from email (part before @) or metadata
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  -- sanitise: keep only alphanumeric + underscore
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g');
  -- ensure uniqueness
  final_username := base_username;
  loop
    exit when not exists (select 1 from public.profiles where username = final_username);
    suffix := suffix + 1;
    final_username := base_username || '_' || suffix;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Helper function ─────────────────────────────────────────

create or replace function public.get_booking_count(p_event_id uuid)
returns integer language sql stable as $$
  select count(*)::integer
  from   public.bookings
  where  event_id = p_event_id
    and  status   = 'confirmed';
$$;

-- ─── Atomic booking function (race-condition safe) ──────────

create or replace function public.book_event(
  p_event_id   uuid,
  p_user_id    uuid default null,
  p_guest_name text default '',
  p_guest_email text default '',
  p_guest_phone text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event     public.events%rowtype;
  v_count     integer;
  v_booking   public.bookings%rowtype;
begin
  -- 1. Fetch the event
  select * into v_event
  from public.events
  where id = p_event_id;

  if not found then
    raise exception 'event_not_found'
      using errcode = 'P0001';
  end if;

  if not v_event.is_published then
    raise exception 'event_not_published'
      using errcode = 'P0002';
  end if;

  -- 2. Lock existing confirmed bookings for this event and count them
  select count(*) into v_count
  from public.bookings
  where event_id = p_event_id
    and status = 'confirmed'
  for update;

  -- 3. Check capacity
  if v_event.capacity is not null and v_count >= v_event.capacity then
    raise exception 'capacity_exceeded'
      using errcode = 'P0003';
  end if;

  -- 4. Check duplicate email
  if exists (
    select 1 from public.bookings
    where event_id = p_event_id
      and guest_email = p_guest_email
      and status = 'confirmed'
  ) then
    raise exception 'duplicate_booking'
      using errcode = 'P0004';
  end if;

  -- 5. Insert and return the booking row
  insert into public.bookings (event_id, user_id, guest_name, guest_email, guest_phone, status)
  values (p_event_id, p_user_id, p_guest_name, p_guest_email, p_guest_phone, 'confirmed')
  returning * into v_booking;

  return v_booking;
end;
$$;

-- ─── Row Level Security ──────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.events         enable row level security;
alter table public.bookings       enable row level security;
alter table public.reviews        enable row level security;
alter table public.notifications  enable row level security;

-- profiles: readable by everyone; writable only by owner
create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete using (auth.uid() = id);

-- events: readable by everyone; insert/update/delete only by creator
create policy "events_select_published"
  on public.events for select using (is_published = true or auth.uid() = creator_id);

create policy "events_insert_auth"
  on public.events for insert with check (auth.uid() = creator_id);

create policy "events_update_own"
  on public.events for update using (auth.uid() = creator_id);

create policy "events_delete_own"
  on public.events for delete using (auth.uid() = creator_id);

-- bookings: creator of the event or booker (by matching user_id or guest_email)
create policy "bookings_select_own"
  on public.bookings for select using (
    auth.uid() = user_id
    or auth.uid() = (select creator_id from public.events where id = event_id)
  );

create policy "bookings_insert_any"
  on public.bookings for insert with check (true);

create policy "bookings_update_own"
  on public.bookings for update using (
    auth.uid() = user_id
    or auth.uid() = (select creator_id from public.events where id = event_id)
  );

-- reviews: readable by everyone; anyone can insert; no updates
create policy "reviews_select_all"
  on public.reviews for select using (true);

create policy "reviews_insert_any"
  on public.reviews for insert with check (true);

-- notifications: only recipient (matched by user email in auth.users)
create policy "notifications_select_own"
  on public.notifications for select using (
    recipient_email = (select email from auth.users where id = auth.uid())
  );

create policy "notifications_insert_service"
  on public.notifications for insert with check (true);

create policy "notifications_update_own"
  on public.notifications for update using (
    recipient_email = (select email from auth.users where id = auth.uid())
  );

-- ─── Seed Data ───────────────────────────────────────────────

-- Two seed users (profiles only – auth.users rows are managed by Supabase Auth)
-- In local dev, create these via the Supabase dashboard or `supabase auth admin create-user`.
-- The profile rows below use fixed UUIDs that can be inserted after creating the auth users.

-- insert into public.profiles (id, username, display_name, avatar_url, bio, sns_links, is_teacher)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'sakura_t',  '田中 さくら',
--    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
--    'ヨガインストラクター歴10年。笑顔と丁寧な指導が信条です。',
--    '{"instagram":"sakura_yoga"}'::jsonb, true),
--   ('00000000-0000-0000-0000-000000000002', 'hana_k', '川口 はな',
--    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
--    'ヨガと抹茶が好きな会社員です。', '{}'::jsonb, false);

-- Seed events (creator_id is nullable, so these work without auth users in local dev)
insert into public.events
  (id, creator_id, title, description, datetime, location, capacity, price,
   image_url, is_published, slug, category, teacher_name, teacher_bio, created_at)
values
  (
    'a0000000-0000-0000-0000-000000000001', null,
    '🌿 体験ヨガレッスン｜初心者大歓迎',
    E'ヨガが初めての方でも安心して参加できる体験レッスンです。\n\n呼吸の整え方から基本のポーズまで、丁寧にお伝えします。動きやすい服装でお気軽にどうぞ。\n\n📦 持ち物：動きやすい服装、タオル\n✅ 少人数制なので個別サポートが受けられます。',
    now() + interval '7 days', '渋谷区○○スタジオ', 8, 1500,
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=500&fit=crop',
    true, 'yoga-taiken-demo', 'ヨガ', '田中 さくら', 'ヨガインストラクター歴10年。笑顔と丁寧な指導が信条です。',
    now() - interval '10 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000002', null,
    '🌸 季節の花でフラワーアレンジメント体験',
    E'春のお花を使ったフラワーアレンジメント教室です。\n\n花の選び方から美しく飾る技法まで丁寧にお伝えします。初心者の方も大歓迎！\n\n📦 持ち物：エプロン（貸出あり）\n🌺 作品はお持ち帰りいただけます。\n✅ 少人数制で丁寧に指導します。',
    now() + interval '3 days', '表参道フラワーサロン', 6, 3500,
    'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800&h=500&fit=crop',
    true, 'flower-arrange-spring', 'フラワー', '山本 花子', 'フラワーデザイナー歴15年。都内各地でワークショップを開催中。',
    now() - interval '8 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000003', null,
    '💎 天然石アクセサリー作り体験',
    E'天然石やビーズを使ったアクセサリー作りを体験しましょう！\n\nネックレス・ブレスレットなど、お好みのアクセサリーをご自身で制作できます。\n\n📦 持ち物：なし（材料はすべてご用意します）\n💍 作品はお持ち帰りいただけます。',
    now() + interval '14 days', '吉祥寺ハンドメイドスタジオ', 8, 4000,
    'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=500&fit=crop',
    true, 'handmade-accessory-natural', 'ハンドメイド', '鈴木 あい', 'ハンドメイドアクセサリー作家。オリジナルブランドも運営中。',
    now() - interval '5 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000004', null,
    '📷 スマホで撮るポートレート撮影会',
    E'プロカメラマンが丁寧に指導する撮影会です。\n\n構図の基本から光の使い方まで実践しながら学べます。スマホカメラでもOK！\n\n📦 持ち物：スマートフォンまたはカメラ\n📸 撮影した写真はその場でフィードバック。',
    now() + interval '5 days', '代官山○○ギャラリー', 10, 2500,
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=500&fit=crop',
    true, 'camera-portrait-workshop', 'カメラ', '佐藤 健', 'フリーランスフォトグラファー。雑誌・広告など幅広く活動中。',
    now() - interval '12 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000005', null,
    '💅 ジェルネイル体験レッスン',
    E'セルフネイルのコツが身につく体験レッスンです。\n\n基本のケアから人気デザインまで、使いやすいジェルネイルで丁寧にお伝えします。\n\n📦 持ち物：なし（材料・道具はすべてご用意）\n💅 当日仕上げた爪はそのままお帰りいただけます。',
    now() + interval '10 days', '新宿ネイルサロン', 4, 5000,
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=500&fit=crop',
    true, 'gel-nail-experience', 'ネイル', '中村 りな', 'ネイリスト歴8年。丁寧な仕上がりと笑顔で接客が人気です。',
    now() - interval '6 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000006', null,
    '🔮 タロットカード個別鑑定',
    E'タロットカードを使った個別鑑定セッションです。\n\n恋愛・仕事・人間関係など、あなたが気になるテーマについて丁寧にリーディングします。\n\n✨ 事前にご相談テーマをお聞きします。\n🃏 録音・メモOKです。',
    now() + interval '2 days', 'オンライン（Zoom）', 1, 3000,
    'https://images.unsplash.com/photo-1600430188203-bbb8dbb15ab2?w=800&h=500&fit=crop',
    true, 'tarot-individual-session', '占い', '星野 みらい', '占い師歴12年。タロット・西洋占星術を専門としています。',
    now() - interval '3 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000007', null,
    '🧘 朝ヨガ×瞑想｜心身リセット体験',
    E'早朝の清々しい時間に、ヨガと瞑想でその日一日をスタートしましょう。\n\nストレッチから始まり、呼吸法、瞑想まで60分のプログラムです。\n\n📦 持ち物：動きやすい服装、ヨガマット（レンタルあり）\n✅ 定期参加者には割引あり。',
    now() + interval '1 day', '恵比寿ウェルネスジム', 12, 1000,
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop',
    true, 'morning-yoga-meditation', 'ヨガ', '高橋 ゆき', 'ヨガ・瞑想インストラクター。毎朝開催中！',
    now() - interval '20 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000008', null,
    '🌸 ドライフラワーリース作り体験',
    E'ドライフラワーを使った可愛いリース作りを体験しましょう。\n\n玄関やお部屋のインテリアとしてもおすすめです。\n\n📦 持ち物：なし（材料はすべてご用意）\n🎀 作品はお持ち帰りいただけます（直径約25cm）。',
    now() + interval '21 days', '目黒フラワーアトリエ', 8, 4500,
    'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&h=500&fit=crop',
    true, 'dry-flower-wreath', 'フラワー', '伊藤 なつ', 'フラワーアーティスト。ドライフラワー専門のアトリエ主宰。',
    now() - interval '2 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000009', null,
    '📷 一眼レフカメラ基礎講座',
    E'一眼レフカメラを使いこなしたい方向けの基礎講座です。\n\nシャッタースピード・絞り・ISO感度など、カメラの基本設定をわかりやすく解説します。\n\n📦 持ち物：一眼レフカメラ（お持ちの方）\n📸 貸し出しカメラもご用意しています。',
    now() + interval '18 days', '渋谷区カルチャーセンター', 15, 3000,
    'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&h=500&fit=crop',
    true, 'slr-camera-basics', 'カメラ', '松本 ゆうじ', '写真家・講師。初心者向けのわかりやすい指導に定評あり。',
    now() - interval '14 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000010', null,
    '💎 レジンアクセサリー体験ワークショップ',
    E'UVレジンを使ったアクセサリー作りを体験しましょう！\n\n押し花・ホログラム・貝殻など好きなパーツを組み合わせてオリジナル作品を作れます。\n\n📦 持ち物：なし（材料はすべてご用意）\n✨ UVライトで硬化するので当日お持ち帰りOK。',
    now() + interval '30 days', '下北沢クラフトスタジオ', 6, 3800,
    'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=500&fit=crop',
    true, 'resin-accessory-workshop', 'ハンドメイド', '川田 ほのか', 'レジンアクセサリー作家。インスタ1万フォロワー。',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- Seed sample bookings (to give non-zero booking counts)
insert into public.bookings (event_id, guest_name, guest_email, status)
values
  ('a0000000-0000-0000-0000-000000000001', 'テスト 太郎', 'taro1@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000001', 'テスト 花子', 'hanako1@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000001', 'テスト 三郎', 'saburo1@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000001', 'テスト 四郎', 'shiro1@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000001', 'テスト 五郎', 'goro1@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000002', 'テスト 六子', 'roku2@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000002', 'テスト 七子', 'nana2@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000002', 'テスト 八子', 'hachi2@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000002', 'テスト 九子', 'kyu2@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000004', 'テスト 十子', 'juu4@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000007', 'テスト じゅういち', 'j11@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000007', 'テスト じゅうに', 'j12@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000009', 'テスト A', 'a9@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000009', 'テスト B', 'b9@example.com', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000009', 'テスト C', 'c9@example.com', 'confirmed')
on conflict do nothing;

-- Seed reviews
insert into public.reviews (event_id, reviewer_name, rating, comment)
values
  ('a0000000-0000-0000-0000-000000000001', '川口 はな', 5,
   '先生がとても優しくて、初めてのヨガでも安心して参加できました！ポーズのコツをひとりひとり丁寧に教えてくださって感動です。また参加したいと思います。'),
  ('a0000000-0000-0000-0000-000000000001', '山田 ゆか', 5,
   '少人数でじっくり教えていただけて本当に良かったです。スタジオの雰囲気も素敵で、日常のストレスがすっきり解消されました。'),
  ('a0000000-0000-0000-0000-000000000001', '佐々木 みほ', 4,
   'ヨガ初体験でしたが、基本からわかりやすく教えてもらえました。もう少し時間があればなおよかったです。リピート確定です！'),
  ('a0000000-0000-0000-0000-000000000002', '田中 まり', 5,
   '春のお花がとても綺麗で、作品を持ち帰ったら家族にも大好評でした！山本先生の説明がとてもわかりやすくて、また参加したいです。'),
  ('a0000000-0000-0000-0000-000000000002', '木村 えり', 4,
   'お花の選び方から教えてもらえて、思った以上に素敵な作品ができました。次回はバラのアレンジメントもやってみたいです。'),
  ('a0000000-0000-0000-0000-000000000003', '高野 あき', 5,
   '天然石のアクセサリーを自分で作れるなんて感激でした！先生のセンスが素晴らしく、とても素敵な仕上がりになりました。プレゼントにも喜ばれました。'),
  ('a0000000-0000-0000-0000-000000000004', '藤本 ゆうき', 5,
   'スマホでこんなに綺麗に撮れるとは思っていませんでした！光の使い方など、すぐに実践できるコツを教えてもらえて大満足です。'),
  ('a0000000-0000-0000-0000-000000000004', '中島 れな', 4,
   '写真の撮り方を基礎から学べて、インスタにアップしたら友達に褒められました。もう少し時間をかけて練習したかったです。'),
  ('a0000000-0000-0000-0000-000000000005', '小山 みか', 5,
   'プロのような仕上がりになってびっくり！中村先生がとても丁寧に教えてくださって、セルフネイルに自信がつきました。'),
  ('a0000000-0000-0000-0000-000000000007', '石田 ひな', 5,
   '早朝から参加する価値がありました！瞑想で頭がすっきりして、その日一日が気持ちよく過ごせました。毎週通いたいです。')
on conflict do nothing;
