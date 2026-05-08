# petit-event-maker 非機能要件

**バージョン**: 1.0.0
**作成日**: 2026-05-08
**前提**: `requirements.md` を補完する非機能要件詳細

---

## 1. パフォーマンス

### 1.1 Core Web Vitals 目標

| 指標 | 目標 | 計測 |
|---|---|---|
| **LCP** (Largest Contentful Paint) | < 2.5s | Vercel Analytics + PageSpeed Insights |
| **FCP** (First Contentful Paint) | < 1.8s | 同上 |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 同上 |
| **INP** (Interaction to Next Paint) | < 200ms | 同上 |
| **TTFB** (Time to First Byte) | < 600ms | Vercel Edge metrics |

### 1.2 Lighthouse スコア目標

| カテゴリ | 目標 |
|---|---|
| Performance | 90+ |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 100 |

### 1.3 API レスポンスタイム

| エンドポイント種別 | 目標 P95 |
|---|---|
| 読取（events一覧、詳細） | < 300ms |
| 書込（予約、決済前処理） | < 800ms |
| 検索/フィルタ | < 500ms |
| パーソナライズフィード | < 800ms |
| AI生成系（タイトル/告知文） | < 5s（ストリーミング表示） |

### 1.4 最適化方針

- **Server Components優先**（Next.js 16 / Turbopack）
- **画像最適化**: Next/Image + WebP/AVIF、`event-images` Storage配信時にCDN経由
- **データベース**: 主要クエリにindex設定済（events.datetime, bookings.event_id等）。新規テーブル追加時はN+1回避を必須レビュー
- **キャッシング**: 公開イベント一覧は `revalidate: 60`、ユーザー固有データはno-cache
- **PostHog**: バッチ送信、メイントランザクションをブロックしない

---

## 2. スケーラビリティ

### 2.1 想定負荷（ローンチ後12ヶ月）

| 指標 | 想定値 |
|---|---|
| 同時オンラインユーザー | 1,000 |
| 月間PV | 100万 |
| 月間予約数 | 10,000 |
| 主催者数 | 5,000 |
| イベント数（累計） | 50,000 |
| 月間AI生成リクエスト | 10,000 |

### 2.2 スケール戦略

| 層 | 戦略 |
|---|---|
| フロント | Vercel Edge自動スケール |
| API | Vercel Functions（Serverless）/ region: `hnd1` |
| DB | Supabase Pro プラン（必要時に上位）/ Read Replica検討 |
| Storage | Supabase Storage / 大容量はR2 or S3移行を検討 |
| 検索/レコメンド | Postgres + pgvector（埋め込み検索）/ Redis（キャッシュ）追加検討 |

### 2.3 ボトルネック予測 & 対応

- **bookings集計**: `count` 集計が増えると重くなる → マテリアライズドビュー or 集計テーブル
- **興味プロファイル計算**: 参加履歴増加で重くなる → cronバッチ事前計算
- **PostHog解析**: 自前集計せず、PostHog/Supabase間連携で対応

---

## 3. 可用性

| 項目 | 基準 |
|---|---|
| 稼働率SLO | 99.5%（月間ダウンタイム < 3.6h） |
| Vercel SLA | 99.99%（プラットフォーム依存） |
| Supabase SLA | 99.9%（Proプラン） |
| Stripe SLA | 99.99% |
| LINE Messaging API | ベストエフォート |

### 3.1 障害対応

- Vercel/Supabase ステータスページ監視
- インシデント発生時はメンテナンスバナー表示（`/api/health`連動）
- 重要処理（決済webhook）は冪等性を担保し、再送に耐える

---

## 4. セキュリティ

### 4.1 認証・認可

| 項目 | 実装方針 |
|---|---|
| 認証 | Supabase Auth（email + password） |
| セッション | HttpOnly Cookie、Secure属性必須 |
| 認可 | Supabase RLS（Row Level Security）で全テーブル保護 |
| 管理者権限 | `profiles.is_admin` フラグ、サーバ側で再検証 |
| イベント管理者 | `event_admins` テーブル、書込APIで都度検証 |

### 4.2 OWASP Top 10 対策

| リスク | 対応 |
|---|---|
| Injection | Supabase Client（Parameterized）使用、生SQL禁止 |
| Broken Auth | Supabase Auth標準、JWT検証はサーバサイド |
| Sensitive Data | パスワードはSupabase内ハッシュ管理、決済情報はStripeに委任（PCI DSS非保持） |
| XXE | XMLパーサ未使用 |
| Broken Access Control | RLS + APIで二重チェック |
| Security Misconfiguration | `.env`はGit除外、Vercel環境変数で管理 |
| XSS | Reactデフォルトエスケープ、`dangerouslySetInnerHTML` 禁止（やむを得ない場合はDOMPurify） |
| Insecure Deserialization | JSON以外のデシリアライズ禁止 |
| Vulnerable Components | `pnpm audit` 月次、依存更新は自動PR |
| Insufficient Logging | 重要操作（予約/決済/管理者操作）はpayment_eventsテーブルに記録 |

### 4.3 決済セキュリティ

- Stripe Checkout / PaymentIntent利用、カード情報はサーバを経由させない
- Stripe Webhook署名検証必須
- `payment_events` テーブルに監査ログ保存
- 不正検知はStripe Radarに委任

### 4.4 LINE連携セキュリティ

- Webhook署名検証（X-Line-Signature）
- アクセストークンは暗号化保存（Supabase Vault検討）
- IDトークン検証時はLINE公開鍵で検証

### 4.5 API レート制限

| 種別 | 制限 |
|---|---|
| 公開API（一覧・検索） | 60req/min/IP |
| 認証必須API（予約・決済） | 30req/min/user |
| AI生成API | 10req/min/user（Pro: 30req/min） |
| LINE Webhook | 制限なし（LINE側） |

---

## 5. プライバシー・コンプライアンス

### 5.1 準拠法令

| 法令 | 対応範囲 |
|---|---|
| 個人情報保護法（日本） | プライバシーポリシー整備、利用目的明示、同意取得 |
| GDPR | EU圏ユーザー対応（将来）、現時点では日本市場優先 |
| 特定商取引法 | 主催者の表記義務、プラットフォームとして表記欄を提供 |
| 資金決済法 | Stripeに委任（プラットフォームは収納代行） |

### 5.2 データ取扱原則

- **最小収集**: 必要最小限のデータのみ取得
- **同意取得**: 参加者→主催者へのデータ共有は明示同意
- **退会対応**: ユーザー削除時、関連個人データは30日以内に削除（`auth.users`カスケード）
- **目的外利用禁止**: 興味プロファイルは本人へのレコメンドにのみ使用、第三者提供なし

### 5.3 データ保持期間

| データ種別 | 保持期間 |
|---|---|
| 予約データ | イベント終了後 3年（特商法/領収書発行対応） |
| 決済ログ（payment_events） | 7年（税務） |
| 興味プロファイル | アカウント存続中 |
| 解析ログ（PostHog） | 90日 |
| 退会後データ | 30日でハードデリート |

---

## 6. アクセシビリティ

| 項目 | 基準 |
|---|---|
| 準拠レベル | **WCAG 2.1 AA** |
| コントラスト比 | テキスト 4.5:1 以上、大きいテキスト 3:1 以上 |
| キーボード操作 | 全機能をキーボードのみで完結可能 |
| スクリーンリーダー | `aria-label`、ランドマーク、適切な見出し階層 |
| フォーカス表示 | デフォルトの輪郭を残す or カスタムだが視認性確保 |
| タッチターゲット | 44px以上 |
| 動きの低減 | `prefers-reduced-motion` 対応 |
| 言語 | 日本語デフォルト、英語対応は将来課題 |

---

## 7. 国際化（i18n）

| 項目 | 現時点 | 将来 |
|---|---|---|
| 言語 | 日本語のみ | 英語、中文（簡） |
| 通貨 | JPY のみ | USD、EUR |
| タイムゾーン | Asia/Tokyo 固定 | ユーザー設定 |
| 日付表示 | `date-fns` 日本ロケール | 多言語ロケール対応 |

---

## 8. 保守性・運用

### 8.1 コード品質

| 項目 | 基準 |
|---|---|
| TypeScript | strict mode、`any` 原則禁止 |
| ESLint | Next.js推奨 + 独自ルール |
| テストカバレッジ | 主要ロジック 80%以上（中期目標） |
| コードレビュー | PR時にAIレビュー（CCAGI: ReviewAgent）実施 |

### 8.2 運用・監視

| 項目 | ツール |
|---|---|
| エラー監視 | Sentry（要導入） |
| 解析 | PostHog（既導入） |
| 稼働監視 | Vercel Analytics、Supabase Logs |
| Stripe決済 | Stripe Dashboard |
| LINE | LINE Developers Console |

### 8.3 バックアップ・復旧

| 項目 | 方針 |
|---|---|
| DB | Supabase日次自動バックアップ（Pro）/ 重要操作前は手動スナップショット |
| Storage | バケットはBucket Versioning有効化検討 |
| 復旧目標（RTO） | 4時間以内 |
| 復旧時点（RPO） | 24時間以内 |

---

## 9. 開発・デプロイ

### 9.1 環境

| 環境 | URL | 用途 |
|---|---|---|
| ローカル | localhost:3007 | 開発 |
| Preview | Vercel自動Preview | PRごと自動デプロイ |
| 本番 | petit-event-maker-am.vercel.app | 本番運用 |

### 9.2 デプロイフロー

- GitHub mainマージ → Vercel自動デプロイは**OFF**
- 本番反映は手動 `npx vercel --prod --yes` 実行
- 将来的にGitHub Actions経由のCI/CDに切替予定

### 9.3 技術スタック制約

| レイヤー | 技術 |
|---|---|
| フロント | Next.js 16.2.0（Turbopack） |
| UI | shadcn/ui + Tailwind + lucide-react + motion/react |
| 状態管理 | React Server Components + minimal client state |
| BaaS | Supabase（Auth/DB/Storage/RLS） |
| 決済 | Stripe |
| 通知 | LINE Messaging API + Resend（メール） |
| AI | Claude API（Anthropic SDK）/ 画像生成は別途検討 |
| 解析 | PostHog |
| デプロイ | Vercel |

---

## 10. 計測（Observability）

### 10.1 必須メトリクス

| カテゴリ | メトリクス |
|---|---|
| ビジネス | DAU/MAU、予約数、主催者数、有料イベント率、Pro転換率 |
| プロダクト | ファネル（閲覧→予約→決済）、フォロー数、レコメンドCTR |
| 技術 | API遅延、エラー率、Vercel Cold Start率 |
| 決済 | Stripe成功率、Webhook処理遅延 |
| AI | AI生成レイテンシ、AI採用率（生成→確定使用） |

### 10.2 イベント設計（PostHog）

主要イベントを定義（実装時詳細化）:
- `event_view`, `event_search`, `event_filter`
- `booking_started`, `booking_completed`, `booking_cancelled`
- `payment_started`, `payment_completed`, `payment_failed`
- `follow_organizer`, `unfollow_organizer`
- `recommend_view`, `recommend_click`
- `ai_generation_requested`, `ai_generation_accepted`

---

## 11. リスクと対応

| リスク | 影響度 | 対応 |
|---|---|---|
| Vercel/Supabase の単一ベンダロックイン | 中 | Postgres互換性確保、必要時に移行可能な設計 |
| LINE API仕様変更 | 中 | Webhook層を抽象化、変更影響を局所化 |
| Stripe手数料増加 | 低 | 手数料モデルに反映、複数PSP対応は将来 |
| AI生成コスト超過 | 中 | プラン別レート制限、キャッシング |
| プライバシー侵害事故 | 高 | RLS厳守、定期セキュリティ監査、ログ最小化 |

---

## 12. 検証方法

| 項目 | 検証手段 |
|---|---|
| パフォーマンス | Lighthouse CI、Vercel Analytics |
| アクセシビリティ | axe-core、Lighthouse |
| セキュリティ | `pnpm audit`、Snyk、`/security-scan` |
| 負荷 | k6 / Artillery（必要時） |
| テスト | Playwright（e2e）、Vitest（unit） |

---

*petit-event-maker Non-Functional Requirements v1.0 — 2026-05-08*
