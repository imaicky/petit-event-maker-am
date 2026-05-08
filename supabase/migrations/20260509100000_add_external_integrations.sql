-- ============================================================
-- 外部連携用URLフィールドを events に追加
-- - Zoom: 既存の zoom_meeting_id / zoom_passcode と並ぶ汎用配信URL
-- - Discord: 関連サーバー招待URL
-- - Substack: 関連ニュースレター/記事URL
-- - YouTube: 録画/配信URL
-- - Eventbrite等: 外部イベントへの相互リンク用
-- ============================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS discord_invite_url text,
  ADD COLUMN IF NOT EXISTS substack_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS slack_invite_url text;

COMMENT ON COLUMN public.events.discord_invite_url IS 'Discordサーバー招待URL（コミュニティ動線用）';
COMMENT ON COLUMN public.events.substack_url IS 'Substackニュースレター/記事URL';
COMMENT ON COLUMN public.events.youtube_url IS 'YouTubeライブ/録画URL';
COMMENT ON COLUMN public.events.slack_invite_url IS 'Slack招待URL';

-- ============================================================
-- profiles にも主催者の常設リンクを追加
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discord_url text,
  ADD COLUMN IF NOT EXISTS substack_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text;

COMMENT ON COLUMN public.profiles.discord_url IS '主催者の常設Discord招待URL';
COMMENT ON COLUMN public.profiles.substack_url IS '主催者のSubstack URL';
COMMENT ON COLUMN public.profiles.youtube_url IS '主催者のYouTubeチャンネルURL';
