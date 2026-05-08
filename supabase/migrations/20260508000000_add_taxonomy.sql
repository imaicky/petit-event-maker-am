-- ============================================================
-- AI領域カテゴリ/タグ体系の再設計（Issue #2）
-- ============================================================
-- 既存 events.category (text) は保持。新たに category_id (FK) を追加。
-- イベントは複数のサブタグを持てる（n:m）。
-- ============================================================

-- ─── event_categories（主カテゴリ・2階層対応）──────────────
CREATE TABLE IF NOT EXISTS public.event_categories (
  id          smallserial PRIMARY KEY,
  slug        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  description text,
  parent_id   smallint    REFERENCES public.event_categories(id) ON DELETE SET NULL,
  sort_order  int         NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_categories_parent
  ON public.event_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_event_categories_active
  ON public.event_categories(is_active, sort_order);

-- ─── event_tags（サブタグ：形式/レベル/ツール/トピック）────────
CREATE TABLE IF NOT EXISTS public.event_tags (
  id         smallserial PRIMARY KEY,
  slug       text        NOT NULL UNIQUE,
  name       text        NOT NULL,
  tag_type   text        NOT NULL
              CHECK (tag_type IN ('format','level','tool','topic')),
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_tags_type
  ON public.event_tags(tag_type, is_active);

-- ─── event_tag_assignments（イベント-タグの中間表）─────────────
CREATE TABLE IF NOT EXISTS public.event_tag_assignments (
  event_id uuid     NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tag_id   smallint NOT NULL REFERENCES public.event_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_eta_tag ON public.event_tag_assignments(tag_id);

-- ─── events.category_id 追加（既存 category text は併存）─────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category_id smallint
  REFERENCES public.event_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_category_id ON public.events(category_id);

-- ─── updated_at トリガ ────────────────────────────────────
DROP TRIGGER IF EXISTS trg_event_categories_updated_at ON public.event_categories;
CREATE TRIGGER trg_event_categories_updated_at
  BEFORE UPDATE ON public.event_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 初期マスタデータ（Seed）
-- ============================================================

-- 主カテゴリ（10種）
INSERT INTO public.event_categories (slug, name, description, sort_order) VALUES
  ('llm',          'LLM活用',                  'ChatGPT/Claude等の使い方、業務活用',           10),
  ('image-gen',    '画像生成',                  'Midjourney / Stable Diffusion / Imagen等',   20),
  ('video-gen',    '動画生成・編集',            'AI動画ツール、Runway、Sora系',               30),
  ('audio',        '音声・音楽',                'TTS、音楽生成、声質変換',                    40),
  ('prompt-eng',   'プロンプトエンジニアリング', 'プロンプト設計、評価、リファクタ',            50),
  ('ai-dev',       'AI開発・実装',              'API活用、エージェント開発、RAG',             60),
  ('ai-business',  'AI×ビジネス',               '業務自動化、AIツール導入相談',               70),
  ('ai-creative',  'AI×クリエイティブ',         'デザイン、コピー、コンテンツ制作',            80),
  ('ai-community', 'AIコミュニティ・座談会',    '情報交換、勉強会、もくもく',                  90),
  ('lifestyle',    'ライフスタイル',            'フラワー / ハンドメイド / 占い等の既存系',   100)
ON CONFLICT (slug) DO NOTHING;

-- 形式タグ
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('format-online',    'オンライン',     'format'),
  ('format-offline',   'リアル',         'format'),
  ('format-hybrid',    'ハイブリッド',   'format'),
  ('format-archive',   'アーカイブ販売', 'format'),
  ('format-workshop',  'ワークショップ', 'format'),
  ('format-lecture',   '講義',           'format'),
  ('format-mokumoku',  'もくもく会',     'format'),
  ('format-meetup',    '座談会',         'format')
ON CONFLICT (slug) DO NOTHING;

-- レベルタグ
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('level-beginner',     '初心者向け',         'level'),
  ('level-intermediate', '中級者向け',         'level'),
  ('level-advanced',     '上級者向け',         'level'),
  ('level-developer',    '開発者向け',         'level'),
  ('level-non-dev',      'ノンエンジニア向け', 'level')
ON CONFLICT (slug) DO NOTHING;

-- ツールタグ（主要なもの。後から追加可能）
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('tool-claude',     'Claude',     'tool'),
  ('tool-chatgpt',    'ChatGPT',    'tool'),
  ('tool-gemini',     'Gemini',     'tool'),
  ('tool-midjourney', 'Midjourney', 'tool'),
  ('tool-sd',         'Stable Diffusion', 'tool'),
  ('tool-runway',     'Runway',     'tool'),
  ('tool-cursor',     'Cursor',     'tool'),
  ('tool-n8n',        'n8n',        'tool'),
  ('tool-dify',       'Dify',       'tool'),
  ('tool-figma',      'Figma',      'tool')
ON CONFLICT (slug) DO NOTHING;

-- トピックタグ
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('topic-rag',          'RAG',                'topic'),
  ('topic-agent',        'AIエージェント',     'topic'),
  ('topic-fine-tuning',  'ファインチューニング', 'topic'),
  ('topic-mcp',          'MCP',                'topic'),
  ('topic-automation',   '業務自動化',         'topic'),
  ('topic-marketing',    'マーケティング活用', 'topic'),
  ('topic-design',       'デザイン制作',       'topic'),
  ('topic-writing',      'ライティング',       'topic')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 既存イベントの category テキスト → category_id へのマッピング
-- 既存値 (フラワー/ハンドメイド/カメラ/ネイル/占い/ヨガ/ランチ会/Instagram/その他)
-- は全て "lifestyle" 配下に紐付ける（後方互換）
-- ============================================================
UPDATE public.events e
   SET category_id = c.id
  FROM public.event_categories c
 WHERE c.slug = 'lifestyle'
   AND e.category_id IS NULL
   AND e.category IS NOT NULL;

-- ============================================================
-- RLS（読み取りはpublic、書き込みはservice_roleのみ）
-- ============================================================
ALTER TABLE public.event_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tag_assignments ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
DROP POLICY IF EXISTS event_categories_read ON public.event_categories;
CREATE POLICY event_categories_read ON public.event_categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS event_tags_read ON public.event_tags;
CREATE POLICY event_tags_read ON public.event_tags
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS eta_read ON public.event_tag_assignments;
CREATE POLICY eta_read ON public.event_tag_assignments
  FOR SELECT USING (true);

-- 主催者または管理者のみ自イベントのタグ割当を編集可能
DROP POLICY IF EXISTS eta_write ON public.event_tag_assignments;
CREATE POLICY eta_write ON public.event_tag_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
       WHERE e.id = event_tag_assignments.event_id
         AND (
           e.creator_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.event_admins ea
              WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
           )
           OR EXISTS (
             SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.is_admin = true
           )
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
       WHERE e.id = event_tag_assignments.event_id
         AND (
           e.creator_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.event_admins ea
              WHERE ea.event_id = e.id AND ea.user_id = auth.uid()
           )
           OR EXISTS (
             SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid() AND p.is_admin = true
           )
         )
    )
  );
