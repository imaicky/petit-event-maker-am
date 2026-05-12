-- ============================================================
-- F3-01 完成: tool / topic タグの seed（Issue #2）
-- ============================================================
-- 初回マイグレーション (20260508000000_add_taxonomy.sql) で
-- format と level だけシードしていた。残りの tool / topic を投入する。
-- ============================================================

-- ─── tool タグ（特定の生成AIサービス・開発ツール）────────────
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('tool-claude',       'Claude',          'tool'),
  ('tool-chatgpt',      'ChatGPT',         'tool'),
  ('tool-gemini',       'Gemini',          'tool'),
  ('tool-copilot',      'GitHub Copilot',  'tool'),
  ('tool-cursor',       'Cursor',          'tool'),
  ('tool-midjourney',   'Midjourney',      'tool'),
  ('tool-sd',           'Stable Diffusion','tool'),
  ('tool-dall-e',       'DALL-E',          'tool'),
  ('tool-imagen',       'Imagen',          'tool'),
  ('tool-runway',       'Runway',          'tool'),
  ('tool-sora',         'Sora',            'tool'),
  ('tool-pika',         'Pika',            'tool'),
  ('tool-suno',         'Suno',            'tool'),
  ('tool-elevenlabs',   'ElevenLabs',      'tool'),
  ('tool-n8n',          'n8n',             'tool'),
  ('tool-dify',         'Dify',            'tool'),
  ('tool-zapier',       'Zapier',          'tool'),
  ('tool-make',         'Make',            'tool'),
  ('tool-langchain',    'LangChain',       'tool'),
  ('tool-llamaindex',   'LlamaIndex',      'tool'),
  ('tool-anthropic-api','Anthropic API',   'tool'),
  ('tool-openai-api',   'OpenAI API',      'tool'),
  ('tool-bedrock',      'AWS Bedrock',     'tool'),
  ('tool-vertex',       'Vertex AI',       'tool')
ON CONFLICT (slug) DO NOTHING;

-- ─── topic タグ（横断的なテーマ・技法）────────────────────────
INSERT INTO public.event_tags (slug, name, tag_type) VALUES
  ('topic-rag',           'RAG（検索拡張生成）',     'topic'),
  ('topic-agent',         'AIエージェント',          'topic'),
  ('topic-mcp',           'MCP',                      'topic'),
  ('topic-fine-tuning',   'ファインチューニング',     'topic'),
  ('topic-embedding',     'Embedding / ベクトル検索', 'topic'),
  ('topic-evaluation',    '評価・eval',              'topic'),
  ('topic-prompt-design', 'プロンプト設計',          'topic'),
  ('topic-cot',           'Chain of Thought',         'topic'),
  ('topic-multimodal',    'マルチモーダル',          'topic'),
  ('topic-vision',        'Vision / 画像理解',       'topic'),
  ('topic-voice',         '音声・TTS',               'topic'),
  ('topic-coding',        'AIコーディング',          'topic'),
  ('topic-design',        'AIデザイン',              'topic'),
  ('topic-marketing',     'AIマーケティング',        'topic'),
  ('topic-automation',    '業務自動化',              'topic'),
  ('topic-ethics',        'AI倫理・ガバナンス',      'topic'),
  ('topic-safety',        '安全性・ガードレール',    'topic'),
  ('topic-startup',       'AIスタートアップ',        'topic'),
  ('topic-research',      'AI研究・論文',            'topic')
ON CONFLICT (slug) DO NOTHING;
