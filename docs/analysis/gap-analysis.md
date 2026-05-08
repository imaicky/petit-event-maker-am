# ギャップ分析レポート

**作成日**: 2026-05-08
**目的**: 現実装を「Peatix上位互換 × AIコンテンツホルダー特化」3本柱で棚卸し
**対象**: petit-event-maker（本番稼働: petit-event-maker-am.vercel.app）

---

## 評価軸（3本柱）

1. **運営負荷削減** — 主催者がイベント運営に費やす時間/手間を最小化
2. **資産化** — 主催者・参加者双方の活動が継続的に積み上がり次回に活きる
3. **レコメンド** — 参加者の傾向解析→興味に刺さるイベントを自動で届ける

---

## 現実装インベントリ

### ページ
events / menus（単発+定期）/ invite / explore / my / notifications / settings(line/profile/stripe) / dashboard / help / [username]

### API（44エンドポイント）
events / menus / bookings / invite / line(webhook/messages/conversations/followers/tags) / stripe(checkout/webhook/settings) / notifications / cron(reminders/line-notify) / admin / upload / reviews / attendance / export / message

### コンポーネント（38）
auth / event-card / event-calendar / explore-filters / trending-events / booking-form / custom-fields-builder / image-upload / line-notify-dialog / line-schedule-prompt / waitlist関連 / review-form / share-button / stories-download-button / video-embed / whats-new ほか

### DB主要テーブル
profiles / events / bookings / reviews / notifications / menus / event_admins / line_accounts / line_messages / line_followers / event_messages / payment_events / waitlist

### 外部連携
Supabase（Auth/DB/Storage） / Stripe（決済） / LINE（公式アカウント連携） / PostHog（解析） / Resend想定（メール）

---

## 3本柱別 強み/不足マトリクス

### 柱1: 運営負荷削減

| 状態 | 機能 |
|---|---|
| ✅ | カスタムフィールド（予約フォーム自由設計） |
| ✅ | キャンセル待ち自動繰上げ＋メール通知 |
| ✅ | LINE 4ステップウィザード＆動画埋込 |
| ✅ | 複数管理者（event_admins） |
| ✅ | リマインダーcron / Stripe自動決済 |
| ✅ | 受付管理（attendance）/ CSVエクスポート |
| ✅ | 複数決済方法（multi-payment-method） |
| ❌ | **AI支援のLP/告知文生成**（タイトル・説明・サムネ） |
| ❌ | **当日運営フロー**（QR受付・モバイル受付UI） |
| ❌ | **領収書/請求書自動発行** |
| ❌ | **アンケート自動収集 → 改善点AI要約** |
| ❌ | **イベント運営チェックリスト・テンプレ拡充** |
| ❌ | **重複参加者の横断管理**（複数イベント間） |

### 柱2: 資産化

| 状態 | 機能 |
|---|---|
| ✅ | profiles（display_name / bio / avatar / sns_links / username） |
| ✅ | reviews / ratings |
| ✅ | カスタムユーザー名URL `/[username]` |
| ⚠️ | event_admins はあるが「主催者組織」概念なし |
| ❌ | **参加者ダッシュボード**（参加履歴・学びログ・参加証明） |
| ❌ | **主催者フォロー / 購読機能**（次回開催を逃さない） |
| ❌ | **主催者ポートフォリオ**（過去実績・参加者の声集約ビュー） |
| ❌ | **プラットフォーム内DM**（現状LINE依存） |
| ❌ | **参加者同士の繋がり**（同意ベースの名刺交換的機構） |
| ❌ | **資料DLボックス / 学びノート**（イベント後の継続価値） |
| ❌ | **アフター動線**（コミュニティ・継続講座への接続） |

### 柱3: レコメンド

| 状態 | 機能 |
|---|---|
| ✅ | PostHog解析基盤（イベント追跡可能） |
| ✅ | カテゴリ（9種：フラワー/ハンドメイド/カメラ等） |
| ✅ | trending-events コンポーネント |
| ⚠️ | カテゴリは趣味系中心、**AIコンテンツホルダー向けタクソノミー未整備** |
| ⚠️ | /explore は新着順固定（sort切替はあるがパーソナライズなし） |
| ❌ | **興味タグ / トピック粒度** |
| ❌ | **ユーザー興味プロファイル**（参加履歴→嗜好抽出） |
| ❌ | **パーソナライズフィード**（一人ひとり別の/explore） |
| ❌ | **類似イベント推薦**（協調フィルタ or ベクトル検索） |
| ❌ | **自然言語検索**（"AIで動画作る系"等の意味検索） |
| ❌ | **開催地ベース推薦**（リアル開催を活かす） |
| ❌ | **主催者→参加者プッシュ**（LINE以外のプラットフォーム内チャネル） |

---

## Peatix との差別化現状

| 項目 | Peatix | 現実装 | 差別化余地 |
|---|---|---|---|
| 決済 | 標準 | ✅ Stripe + マルチ決済 | 同等 |
| LINE連携 | 弱い | ✅ 深い統合 | **優位** |
| カスタムフォーム | 弱い | ✅ あり | **優位** |
| 検索/発見 | 標準 | 新着順止まり | **劣位（要強化）** |
| レコメンド | 標準 | なし | **劣位（最大ギャップ）** |
| ファン化 | フォロー機能あり | なし | **劣位（要追加）** |
| AI領域特化 | なし | カテゴリは趣味系 | **未着手（最大機会）** |

---

## 重要発見

1. **PostHog既導入**: レコメンド基盤の前提が既に整っている。イベントログ拡充→特徴量化のラインは速く引ける
2. **LINE統合は強い武器**: Peatixが弱いゾーン。AIコンテンツホルダー（X/Discord/LINEを使い分ける層）への訴求点
3. **カテゴリが趣味系**: 「フラワー/ネイル/占い」中心。AIコンテンツホルダー向けには「LLM活用 / 画像生成 / 自動化 / コミュニティ運営 / プロンプト」等の再設計が必要
4. **/explore の発見性が弱い**: 新着順固定。本プラットフォームの最大改善余地
5. **参加履歴が"使えていない"**: bookings は存在するが、参加者向けダッシュボードでの可視化・主催者向けの参加者プロファイル化が未実装

---

## 推奨優先度（次フェーズ要件定義の論点）

### 🔴 P0（差別化の核）
- AIコンテンツホルダー向け**カテゴリ/タグ体系の再設計**
- **興味プロファイル + パーソナライズ /explore**
- **主催者フォロー機能**（資産化＋次回告知）

### 🟠 P1（運営UX劇的改善）
- AI生成（タイトル・説明・サムネ・告知文）
- 参加者ダッシュボード（参加履歴の見える化）
- 当日QR受付フロー

### 🟡 P2（継続価値）
- アンケート自動収集＋AI要約
- 資料DLボックス / 学びノート
- 主催者ポートフォリオページ

### 🟢 P3（拡張）
- 自然言語検索
- 開催地レコメンド
- プラットフォーム内DM

---

## 次のステップ

このギャップを下敷きに **Phase 1要件定義（タスクB）** へ。ペルソナ・ユースケースのヒアリングを併走させながら `docs/requirements/` を作成する。
