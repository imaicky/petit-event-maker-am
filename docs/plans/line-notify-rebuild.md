# LINE通知システム全面再構築 実装プラン

## 背景

プロダクション運用中の petit-event-maker において、イベント主催者がLINE公式アカウント連携で予約通知を受け取る機能を再構築する。

### 判明している問題

本番DB調査結果（8 line_accountsレコード）:
- `owner_line_user_id` がセットされているのは1件のみ（imatoru本人）
- 残り7アカウントは通知先未設定 → 通知が一切届かない
- 2アカウントは `channel_secret` がNULL → webhook署名検証で silently fail
- 通知先設定UIがフォロワー一覧経由でしか到達できず、セットアップが完了しない
- マニュアル(`guide`, `wizard`)が古く「LINE Official Account Manager で作成」と書いてあるが、現在は Developers Console が正しい

## アーキテクチャ概観

### 新規API route
| Path | 用途 |
|------|------|
| `POST /api/line/notify-recipients` | `notify_line_user_ids` の追加/削除（管理者代理対応） |
| `POST /api/line/diagnose` | 連携診断（疎通・署名・通知先・webhook到達のチェック） |
| `POST /api/line/test-push` | 設定済み通知先へテストpush送信 |
| `GET  /api/admin/line/health` | 全`line_accounts`の健全性レポート（システム管理者専用） |

### 修正する既存route
- `POST /api/line` — `channel_secret` を新規連携時に必須化
- `POST /api/line/set-owner` — `line_user_id` 直接入力モード追加（`pushLineMessage` pre-flight check）
- `POST /api/line/webhook` — 例外時/署名失敗時に `last_webhook_error` / `last_webhook_signature_failed_at` を更新

### 新規UIページ
- `/admin/line` — システム管理者専用のヘルスレポート＋一括代理セット

### `/settings/line/page.tsx` 改修ブロック
1. 冒頭に警告バナー（secret欠落 / 通知先未設定）
2. 「通知先（管理者LINE）」SectionCard — LINE User ID 直接入力
3. 「連携診断」SectionCard — 信号機表示

## データモデル変更

### 新規マイグレーション `20260517000000_line_diagnostics.sql`

```sql
ALTER TABLE public.line_accounts
  ADD COLUMN IF NOT EXISTS last_webhook_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_webhook_error TEXT,
  ADD COLUMN IF NOT EXISTS last_webhook_signature_failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_line_accounts_health
  ON public.line_accounts (channel_secret, owner_line_user_id)
  WHERE is_active = true;
```

### 既存カラム利用方針
- `notify_line_user_ids[]` がメインの通知先データソース
- `owner_line_user_id` はレガシー fallback として維持（後方互換）
- `channel_secret` はNOT NULL制約を付けない（既存7アカウントを壊さないため）

## API詳細

### POST /api/line/notify-recipients
**req**: `{ action: "add" | "remove", line_user_id: string, target_user_id?: string }`
**resp**: `{ notify_line_user_ids: string[] }`

- 認可: `resolveTargetUser`。管理者なら他人の編集可
- バリデーション: `/^U[0-9a-f]{32}$/i` 正規表現
- pre-flight: `pushLineMessage` を試行し、403/400 なら「友だち追加されていません」エラー
- `add` 時、`owner_line_user_id` がNULLなら同時にセット

### POST /api/line/diagnose
**resp**:
```ts
{
  channel: { has_token: boolean, has_secret: boolean, bot_info_ok: boolean, bot_user_id: string|null },
  webhook: { last_event_at: string|null, last_error: string|null, last_signature_failed_at: string|null },
  recipients: { owner: string|null, notify_count: number, notify_ids: string[] },
  warnings: string[]
}
```

### POST /api/line/test-push
**req**: `{ target_user_id?: string, recipient: "owner" | "all" | string }`
**resp**: `{ results: Array<{ line_user_id, ok, error? }> }`

### GET /api/admin/line/health
権限: システム管理者のみ
resp: 全line_accountsを1行ずつ healthスコア化
- critical: token か bot_user_id が NULL
- warning: channel_secret 未設定 OR 通知先0件
- ok: 全て揃っている

### POST /api/line/webhook（修正）
- 例外時: `last_webhook_error` 更新
- 署名失敗時: `last_webhook_signature_failed_at` 更新
- 正常処理時: `last_webhook_event_at = now()` 更新
- 「通知ON/OFF」コマンド処理は完全維持（後方互換）

## UI実装詳細

### `/settings/line/page.tsx` 改修

連携済み状態の構造に以下を追加（既存セクション順を尊重）:

1. **冒頭・既存onboarding bannerの上**: `WarningBanner`
   - secret欠落 → 赤バナー + inline補完フォーム
   - 通知先未設定 → 黄バナー

2. **「通知先（管理者LINE）」SectionCard** — 「フォロワー一覧」の直前
   - LINE User ID 直接入力フォーム（`U...` 32桁）+「追加」ボタン
   - 現在の `notify_line_user_ids[]` をチップ表示。各チップに削除ボタン
   - 「テスト通知を送る」ボタン

3. **「連携診断」SectionCard** — 「セットアップガイド」の上
   - 「診断を実行」ボタン → 信号機表示:
     - チャネル接続 / Webhook受信 / 署名検証 / 通知先

### 新規 `/admin/line/page.tsx`
- 認可: `/api/admin/users` で `isAdmin=false` ならリダイレクト
- ヘルスサマリー（critical/warning/ok カウント）
- テーブル: ユーザー / channel_name / has_secret / has_owner / notify_count / last_webhook_event_at / [操作]
- 操作: 「代理セット」ボタン or `/settings/line?target_user_id=...` への遷移

## マニュアル刷新（guide ステップ）

| Step | タイトル | キー操作 |
|------|---------|---------|
| 1 | LINE Developers Console にログイン | developers.line.biz/console/ |
| 2 | プロバイダー作成 | 「新規プロバイダー作成」→ 公開名入力 |
| 3 | **Messaging API チャネル**作成 | 「LINE Loginと間違えない」強調 |
| 4 | チャネル基本設定 → **チャネルシークレット**取得 | 32桁コピー（必須） |
| 5 | Messaging API設定 → **チャネルアクセストークン（長期）**発行 | 「発行」ボタン |
| 6 | petit event maker で貼り付け → 接続テスト | 両方必須 |
| 7 | Webhook URL貼り付け + **「Webhookの利用」ON** + 検証 | 最大の落とし穴 |
| 8 | **通知先を登録**（2通り） | (A) UIで LINE User ID 直接入力 / (B) 友だち追加後にトークで「通知ON」 |
| 9 | 応答メッセージOFF + あいさつ文編集 | Official Account Managerで |
| 10 | 連携診断ボタンで全項目グリーン確認 | 完了 |

## テスト計画

- 型チェック: `pnpm tsc --noEmit`
- lint: `pnpm lint`
- vitest: `notify-recipients` zod validation
- 手動E2E:
  1. 成功パス: token+secret接続 → diagnose全グリーン → LINE ID直接入力 → test-push成功
  2. 欠落パス: secret未設定で接続 → 警告バナー表示 → 補完フォーム
  3. 誤入力パス: `U`で始まらないID → 400エラー
  4. 管理者代理パス: imatoruで `/admin/line` → 代理セット
  5. webhook failパス: 不正署名で叩く → `last_webhook_signature_failed_at` 更新

### 既存imatoruアカウント保護
- マイグレーション前後で `notify_line_user_ids` の中身が変わらないことをSELECTで確認
- `owner_line_user_id` フォールバックパスを維持

## デプロイ＆既存修復段取り

### フェーズA（後方互換のみ・即デプロイ可）
1. マイグレーション `20260517000000_line_diagnostics.sql` 適用
2. webhook route 修正（診断ログ書き込み）
3. `/api/line/diagnose`, `/api/admin/line/health`
4. `/admin/line` ページ公開

### フェーズB（UI改修）
5. `/settings/line/page.tsx` 改修 + wizard/guide刷新
6. `/api/line/notify-recipients`, `set-owner` 直接入力対応

### フェーズC（既存アカウント修復）
- imatoru が `/admin/line` でヘルス目視
- secret欠落2件: 各管理者に個別連絡 + 手順テンプレ送付
- 通知先未設定7件: LINE User ID聞き出し or 「通知ON」依頼 → 代理セット

## リスク・落とし穴

| リスク | 対策 |
|-------|------|
| 「通知ON/OFF」コマンドとUI操作の競合 | 冪等性で問題なし。仕様として説明文に明記 |
| webhook silently fail | `last_webhook_error` カラムで観測可能化 |
| マイグレーション未適用問題の再発 | `/admin/line` で `last_webhook_event_at` 全件NULLなら警告バナー |
| follower未登録IDの扱い | `pushLineMessage` pre-flight checkで許容（不正入力リスク低い） |
| channel_secret必須化のタイミング | 新規連携でのみ必須、既存PATCHは省略可 |
