# petit-event-maker 機能仕様書

**バージョン**: 1.0.0
**作成日**: 2026-05-08
**入力**: `docs/requirements/requirements.md`
**位置づけ**: Phase 2機能仕様。実装フェーズ（Phase 4）の起点

---

## 1. システム構成

### 1.1 全体アーキテクチャ

```
[ User Browser ]
       │
       ▼
[ Vercel Edge ] ── Static / SSR / RSC
       │
       ├──► [ Next.js App Router ]
       │       ├── app/(public): /, /explore, /events/[id], /[username]
       │       ├── app/(auth):   /my, /dashboard, /settings/*
       │       └── app/api:     44 endpoints
       │
       ├──► [ Supabase ] PostgreSQL + RLS + Auth + Storage
       ├──► [ Stripe ]   Checkout + Webhook + Receipts
       ├──► [ LINE ]     Messaging API + Webhook
       ├──► [ Claude API ] AI生成（タイトル/告知文/要約）
       └──► [ PostHog ]  Analytics + Feature Flags
```

### 1.2 主要ドメインモデル（拡張後）

```
profiles (user)
  ├─ events (1:n)
  ├─ bookings (n:m via events)
  ├─ follows (organizer-side, 1:n)             ← 新規 #1
  ├─ user_interest_scores (1:n)                ← 新規 #3
  ├─ event_views (1:n)                         ← 新規 #3
  └─ line_accounts (1:1)

events
  ├─ bookings (1:n)
  ├─ reviews (1:n)
  ├─ event_admins (1:n)
  ├─ category (FK to event_categories)         ← 新規 #2
  └─ tags (n:m via event_tag_assignments)      ← 新規 #2

event_categories (新規 #2)
  └─ events (1:n)

event_tags (新規 #2)
  └─ events (n:m)

menus
  └─ menu_bookings (1:n)
```

---

## 2. 主要画面仕様

### 2.1 ランディング `/`

| 項目 | 仕様 |
|---|---|
| レイアウト | ヒーロー + 機能セクション + フッター |
| ヒーロー | セリフ大見出し "Where AI educators meet their next audience." + サブコピー + CTA 2つ |
| CTA | "イベントを見る → /explore" / "イベントを始める → /events/new" |
| セクション | ① 強み（フォロー/レコメンド/AI支援）② ペルソナ別ユースケース ③ 直近イベント ④ よくある質問 |
| ダークモード | 自動 + 手動切替 |

### 2.2 探索 `/explore`（**改修対象 #4**）

| 状態 | 仕様 |
|---|---|
| 未ログイン | "人気のイベント" + "新着" タブ + カテゴリフィルタ |
| ログイン | **"あなたへのおすすめ"** トップ表示 + "フォロー中の主催者" + "新着" + "近くのイベント" |
| フィルタ | カテゴリ + サブタグ（形式/レベル/ツール）+ 開催地 + 価格帯 + 開催日 |
| 並び順 | おすすめ / 近日順 / 人気順 / 評価順 |
| カード | 4:3画像 / タイトル / 主催者 / 日時 / 場所 / カテゴリピル / 残席 |

### 2.3 イベント詳細 `/events/[id]`

| 項目 | 仕様 |
|---|---|
| 上部 | ヒーロー画像 + タイトル + 主催者カード（**フォローボタン #1**） |
| 本文 | 説明 / 開催情報 / 持ち物 / 主催者プロフィール / レビュー |
| 右パネル | 予約ボックス（sticky）/ 残席 / 価格 / 決済方法 |
| 下部 | **関連イベント（推薦 #4）** / 同じ主催者の他のイベント |
| モバイル | 予約ボックスは画面下部固定 |

### 2.4 主催者ポートフォリオ `/[username]`

| 項目 | 仕様 |
|---|---|
| ヘッダー | アバター / display_name / bio / SNSリンク / **フォローボタン #1** / フォロワー数 |
| タブ | 開催中 / 過去 / レビュー集 |
| 開催中 | カード列、開催日順 |
| 過去 | カード列、参加者の声集約 |
| レビュー集 | 主催者宛のレビュー集約、平均評価 |

### 2.5 マイページ `/my`（**拡張 #1, #3**）

| タブ | 仕様 |
|---|---|
| 予約 | 確定 / キャンセル待ち / 過去 |
| お気に入り | ハート登録イベント |
| **フォロー中の主催者** | フォロー一覧、新着イベント通知 |
| **興味プロファイル** | 自動抽出タグ + 編集UI |
| 通知設定 | メール / LINE / プッシュ |

### 2.6 ダッシュボード `/dashboard`（主催者）

| パネル | 仕様 |
|---|---|
| 概要 | 開催数 / 累計参加者 / 平均評価 / フォロワー数推移 |
| イベント管理 | 自イベント一覧 / 公開状態切替 / 集計 |
| 参加者分析 | **興味タグ分布**（集計、個人特定なし） |
| 通知 | フォロー / 予約 / レビュー受信 |
| Pro機能 | AI生成 / 詳細分析 / 高度フィルタ |

---

## 3. 主要API仕様（新規分のみ）

### 3.1 フォロー（Issue #1）

| Method | Path | 用途 |
|---|---|---|
| POST | `/api/profiles/[username]/follow` | フォロー作成 |
| DELETE | `/api/profiles/[username]/follow` | フォロー解除 |
| GET | `/api/my/follows` | フォロー一覧 |
| GET | `/api/profiles/[username]/followers/count` | フォロワー数（公開） |

### 3.2 タクソノミー（Issue #2）

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/categories` | カテゴリ一覧（マスタ） |
| GET | `/api/tags?type=` | タグ一覧（種別フィルタ） |
| POST | `/api/events/[id]/tags` | イベントタグ割当（主催者のみ） |

### 3.3 興味プロファイル（Issue #3）

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/my/interests` | 自分の興味タグ + スコア |
| PATCH | `/api/my/interests` | 明示的タグの追加/削除 |
| POST | `/api/events/[id]/view` | 閲覧トラッキング（idempotent） |

### 3.4 パーソナライズフィード（Issue #4）

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/feed?type=foryou\|popular\|nearby\|following` | フィード取得 |
| POST | `/api/feed/dismiss` | 「興味なし」反映 |

---

## 4. データベース設計（追加分）

### 4.1 follows（Issue #1）

```sql
CREATE TABLE follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notify_email boolean NOT NULL DEFAULT true,
  notify_line boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, organizer_id),
  CHECK (follower_id != organizer_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_organizer ON follows(organizer_id);

-- RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
-- 自分のフォロー関係のみ操作可能
-- フォロワー数集計は service_role 経由のRPC関数で公開
```

### 4.2 event_categories / event_tags（Issue #2）

```sql
CREATE TABLE event_categories (
  id smallserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  parent_id smallint REFERENCES event_categories(id),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_tags (
  id smallserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tag_type text NOT NULL CHECK (tag_type IN ('format', 'level', 'tool', 'topic')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_tag_assignments (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id smallint NOT NULL REFERENCES event_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

ALTER TABLE events ADD COLUMN category_id smallint REFERENCES event_categories(id);
CREATE INDEX idx_events_category_id ON events(category_id);
```

### 4.3 user_interest_scores / event_views（Issue #3）

```sql
CREATE TABLE user_interest_scores (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id smallint NOT NULL REFERENCES event_tags(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('booking','view','favorite','explicit')),
  score real NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tag_id, source)
);

CREATE TABLE event_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_views_user_time ON event_views(user_id, viewed_at DESC);
CREATE INDEX idx_user_interest_user ON user_interest_scores(user_id);
```

---

## 5. 実装シーケンス（推奨）

```
Wave 1: 基盤
  ├─ Issue #2 タクソノミー再設計
  │   ├─ Migration: event_categories / event_tags / assignments
  │   ├─ Seed: 10カテゴリ + サブタグ初期セット
  │   └─ UI: イベント作成フォームのタグ選択
  └─ Issue #1 主催者フォロー
      ├─ Migration: follows
      ├─ API: follow / unfollow / list
      └─ UI: /[username] フォローボタン / /my/follows

Wave 2: 興味データ
  └─ Issue #3 興味プロファイル
      ├─ Migration: user_interest_scores / event_views
      ├─ Tracking: 閲覧/予約/お気に入り
      ├─ Batch: 日次スコア再計算
      └─ UI: /my/interests

Wave 3: レコメンド
  └─ Issue #4 パーソナライズフィード
      ├─ Postgres関数: スコア合成
      ├─ API: /api/feed
      ├─ UI: /explore改修
      └─ A/Bテスト: PostHog Feature Flag
```

---

## 6. テスト方針

| レベル | ツール | カバレッジ目標 |
|---|---|---|
| Unit | Vitest | ロジック層 80% |
| Integration | Vitest + Supabase Test DB | 主要API 80% |
| E2E | Playwright | クリティカルパス（予約/決済/フォロー）100% |

---

## 7. 次のステップ

- [ ] `docs/design/ui-guidelines.md`（任意）
- [ ] `docs/design/component-specs/`（必要時）
- [ ] Phase 4 実装着手（推奨: Issue #2 から）
- [ ] Phase 3 補完: Issue 詳細化、Sub-Issueの追加

---

*petit-event-maker Spec v1.0 — 2026-05-08*
