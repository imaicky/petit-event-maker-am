# 主要フロー シーケンス図

**バージョン**: 1.0
**最終更新**: 2026-05-09

---

## 1. 有料イベント予約 → 決済（Stripe Connect）

```mermaid
sequenceDiagram
    actor U as 参加者
    participant Web as Next.js
    participant API as /api/events/[id]/book
    participant DB as Supabase
    participant Stripe as Stripe Platform
    participant Connect as 主催者Stripeアカウント
    participant Mail as Resend
    participant LINE as LINE Messaging API

    U->>Web: イベント詳細を表示
    Web->>DB: event/booking_count 取得
    Web-->>U: 予約フォーム表示

    U->>Web: 予約フォーム送信
    Web->>API: POST /book
    API->>DB: bookings INSERT (payment_status=pending)
    API->>DB: stripe_settings 取得
    Note over API: connect_mode = standard
    API->>Stripe: createConnectCheckoutSession<br/>+ application_fee_amount(5%)<br/>+ stripeAccount: acct_xxx
    Stripe-->>API: session.url
    API-->>Web: { url }
    Web-->>U: Stripe Checkout に遷移

    U->>Stripe: カード入力
    Stripe->>Connect: 支払い金額 - 手数料 を入金
    Stripe->>Stripe: 手数料分 application_fee を保留

    Stripe-->>API: webhook /api/stripe/webhook<br/>checkout.session.completed
    API->>DB: bookings UPDATE payment_status=paid
    API->>DB: payment_events INSERT
    API->>Mail: 確認メール送信（参加者）
    API->>Mail: 通知メール送信（主催者）
    API->>LINE: pushLineMessage(主催者通知)<br/>or multicastLineMessage(複数管理者)

    Stripe-->>U: success_url にリダイレクト
    Web-->>U: /events/[id]/thanks 表示
```

---

## 2. キャンセル待ち自動繰り上げ

```mermaid
sequenceDiagram
    actor C as キャンセル者
    actor W as キャンセル待ち #1
    participant API as /api/events/[id]/cancel
    participant Promo as waitlist-promotion.ts
    participant DB as Supabase
    participant Mail as Resend
    participant LINE as LINE

    C->>API: POST cancel
    API->>DB: bookings UPDATE status=cancelled
    API->>DB: confirmed数 SELECT
    Note over API: 定員 > confirmed数<br/>→ waitlist促進

    API->>Promo: promoteWaitlistOnCancellation()
    Promo->>DB: waitlisted を created_at ASC で取得
    Promo->>DB: bookings UPDATE status=confirmed
    Promo->>Mail: W に「繰り上がりました」メール
    Promo->>LINE: 主催者へ「W 繰り上がり」通知
    Promo-->>API: 完了

    API-->>C: 200 OK
```

---

## 3. AI生成シラバス推薦（Claude Haiku 4.5）

```mermaid
sequenceDiagram
    actor O as 主催者
    participant Web as /dashboard/insights/[id]
    participant API as /api/events/[id]/syllabus-ai
    participant Auth as canManageEvent
    participant Audience as user-history.ts
    participant DB as Supabase
    participant Claude as Claude API

    O->>Web: インサイト画面を開く
    Web->>O: 「次回イベントの提案」セクション表示

    O->>Web: 「提案を生成」クリック（AIモード）
    Web->>API: GET /syllabus-ai
    API->>Auth: canManageEvent(eventId, userId)
    Auth->>DB: events.creator_id<br/>+ event_admins<br/>+ super-admin判定
    Auth-->>API: allowed=true

    API->>Audience: getAudienceInsights(eventId)
    Audience->>DB: bookings (confirmed) → user_id一覧
    Audience->>DB: 参加者の他イベント参加履歴
    Audience->>DB: events.category / category_id
    Audience-->>API: { participantCount, topCategories,<br/>aiLevelDistribution }

    API->>DB: 主催者の過去開催カテゴリ取得
    API->>Claude: messages.parse<br/>+ system prompt(cache_control)<br/>+ Zod schema
    Claude-->>API: { suggestions: [3件] }<br/>title/rationale/level/format/duration
    API-->>Web: { suggestions, mode: ai }
    Web-->>O: 3つの提案カード表示
```

---

## 4. LINE複数管理者通知（multicast）

```mermaid
sequenceDiagram
    participant Admin1 as 管理者A<br/>（連携者）
    participant Admin2 as 管理者B
    participant LINE as LINE公式アカウント
    participant Webhook as /api/line/webhook
    participant DB as Supabase
    participant Book as /api/events/[id]/book

    Note over Admin1,LINE: 初期: 管理者Aが連携、owner_line_user_id 登録済み

    Admin2->>LINE: 「通知ON」とメッセージ送信
    LINE->>Webhook: event: message
    Webhook->>DB: line_accounts.notify_line_user_ids<br/>に Admin2 の userId を追加
    Webhook->>LINE: pushLineMessage(Admin2,<br/>"✅ 通知を有効化しました")
    LINE-->>Admin2: 確認メッセージ

    Note over Book: 後で予約発生時
    Book->>DB: notify_line_user_ids 取得
    Note over Book: [Admin1, Admin2] の2人分
    Book->>LINE: multicastLineMessage([A, B], 通知文)
    LINE-->>Admin1: 予約通知
    LINE-->>Admin2: 予約通知
```

---

## 5. 未払い予約への自動リマインダー（cron）

```mermaid
sequenceDiagram
    participant Cron as Vercel Cron<br/>毎日 00:00
    participant API as /api/cron/payment-reminders
    participant DB as Supabase
    participant Stripe as Stripe
    participant Mail as Resend
    actor User as 参加者

    Cron->>API: GET (Authorization: Bearer CRON_SECRET)
    API->>DB: pending bookings<br/>+ event 情報 (created_at >= 7日前)

    loop 各booking
        Note over API: 24h-72h かつ 未送信 → tier=24h
        Note over API: 72h以降 かつ 第1回送信から24h経過 → tier=72h
        API->>DB: stripe_settings 取得（connect_mode判定）
        API->>Stripe: 新Checkout Session作成<br/>（idempotencyKey=auto-tier-hourly）
        Stripe-->>API: session.url
        API->>Mail: リマインドメール送信<br/>（72hなら「最終ご案内」）
        API->>DB: bookings.payment_reminded_at 更新
    end

    API-->>Cron: { processed: N, results: [...] }

    Note over User: 受信
    Mail-->>User: 「クレジットカードでお支払い」ボタン
    User->>Stripe: クリック → Checkout
    User->>Stripe: カード入力 → 完了
    Stripe-->>API: webhook → payment_status=paid
```

---

## 6. Stripe Connect OAuth 連携

```mermaid
sequenceDiagram
    actor O as 主催者
    participant Settings as /settings/stripe
    participant Start as /api/stripe/connect/start
    participant Stripe as Stripe Connect OAuth
    participant Callback as /api/stripe/connect/callback
    participant DB as Supabase

    O->>Settings: 「Stripeで連携する」クリック
    Settings->>Start: GET
    Start->>Start: state生成（CSRF token）
    Start->>O: cookie設定 + redirect to Stripe
    O->>Stripe: 認可画面（既存acct or 新規作成）
    O->>Stripe: 「許可」
    Stripe->>Callback: GET ?code=xxx&state=xxx

    Callback->>Callback: state cookie検証（CSRF）
    Callback->>Stripe: oauth.token(code)
    Stripe-->>Callback: { stripe_user_id: acct_xxx,<br/>scope, livemode }

    Callback->>Stripe: accounts.retrieve(acct_xxx)
    Stripe-->>Callback: charges_enabled, payouts_enabled,<br/>details_submitted

    Callback->>DB: stripe_settings UPSERT<br/>connect_mode='standard'<br/>stripe_account_id=acct_xxx<br/>charges_enabled=true...
    Callback->>O: redirect /settings/stripe?connect=ok
```

---

## 7. 興味プロファイル算出 + AIスキルレベル判定

```mermaid
sequenceDiagram
    actor U as 参加者
    participant My as /my/history
    participant API as /api/my/history
    participant Lib as user-history.ts
    participant DB as Supabase

    U->>My: マイページ → 履歴タブ
    My->>API: GET
    API->>Lib: getUserHistory(userId)

    Lib->>DB: bookings (confirmed) where user_id
    Lib->>DB: events 取得（category, category_id）
    Lib->>DB: event_categories master
    Lib->>DB: event_tag_assignments + event_tags

    Note over Lib: AI領域の判定<br/>新タクソノミー slug + レガシー正規表現
    Note over Lib: AIレベル算出<br/>0=未参加, 1-2=入門,<br/>3-5=初級(or中級), 6-10=中級, 11+=上級

    Lib->>Lib: by_category / by_tag_topic 集計
    Lib->>Lib: recommended_next（未経験AI領域）
    Lib-->>API: UserHistory
    API-->>My: 履歴データ
    My-->>U: 集計表示<br/>＋AIレベルバッジ<br/>＋次に試したいAI領域チップ
```

---

## 8. Webhook認可（Stripe webhook 多店舗対応）

```mermaid
sequenceDiagram
    participant Stripe
    participant Webhook as /api/stripe/webhook
    participant DB as Supabase

    Stripe->>Webhook: POST (signature header)
    Webhook->>DB: 全 stripe_settings.webhook_secret 取得
    Webhook->>DB: + env STRIPE_WEBHOOK_SECRET（fallback）

    loop secret ごと
        Webhook->>Webhook: stripe.webhooks.constructEvent(body, sig, secret)
        alt 署名一致
            Note over Webhook: マッチした secretKey で<br/>その後の処理を実行
        else 失敗
            Note over Webhook: 次のsecretへ
        end
    end

    Webhook->>DB: イベント種別ごとに<br/>bookings/payment_events を更新
    Webhook-->>Stripe: 200 OK
```

---

*Sequence Diagrams v1.0 — 2026-05-09*
