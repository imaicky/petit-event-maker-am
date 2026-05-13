-- ============================================================
-- AI領域の深掘りタグ追加 seed（Issue #2 補強）
-- ============================================================
-- 初版（20260512100000）の topic タグでは粒度が粗かったため、
-- RAG / Agent / Eval / 開発手法など、より実用的な細分タグを追加する。
-- ============================================================

-- ─── RAG 深掘りタグ ────────────────────────────────────────
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('topic-rag-basic',        'RAG入門',                'topic'),
  ('topic-rag-advanced',     'RAG実装応用',            'topic'),
  ('topic-graph-rag',        'GraphRAG',               'topic'),
  ('topic-hybrid-search',    'ハイブリッド検索',       'topic'),
  ('topic-chunking',         'チャンキング戦略',       'topic'),
  ('topic-pgvector',         'pgvector',               'topic'),
  ('topic-reranker',         'リランキング',           'topic'),
  ('topic-citation',         '出典付き回答',           'topic')
ON CONFLICT (slug) DO NOTHING;

-- ─── エージェント深掘り ────────────────────────────────────
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('topic-agent-loop',       'エージェントループ',     'topic'),
  ('topic-tool-use',         'Tool Use',               'topic'),
  ('topic-planning',         'タスク分解・計画',       'topic'),
  ('topic-memory',           'メモリ・状態管理',       'topic'),
  ('topic-multi-agent',      'マルチエージェント',     'topic')
ON CONFLICT (slug) DO NOTHING;

-- ─── 評価・運用 ────────────────────────────────────────
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('topic-eval-llm',         'LLM-as-a-Judge',         'topic'),
  ('topic-promptfoo',        'promptfoo / 自動評価',   'topic'),
  ('topic-observability',    '可観測性 (LangSmith等)', 'topic'),
  ('topic-cost-optim',       'コスト最適化',           'topic'),
  ('topic-latency-optim',    'レイテンシ最適化',       'topic')
ON CONFLICT (slug) DO NOTHING;

-- ─── ツールタグ追加（最近よく使われるもの）────────────────
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('tool-windsurf',          'Windsurf',               'tool'),
  ('tool-v0',                'v0',                     'tool'),
  ('tool-cline',             'Cline',                  'tool'),
  ('tool-aider',             'aider',                  'tool'),
  ('tool-zed',               'Zed',                    'tool'),
  ('tool-replit-agent',      'Replit Agent',           'tool'),
  ('tool-codex',             'Codex',                  'tool'),
  ('tool-claude-code',       'Claude Code',            'tool'),
  ('tool-perplexity',        'Perplexity',             'tool'),
  ('tool-notebooklm',        'NotebookLM',             'tool')
ON CONFLICT (slug) DO NOTHING;
