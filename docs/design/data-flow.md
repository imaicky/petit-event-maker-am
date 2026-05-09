# データフロー図 / ER図

**バージョン**: 1.0
**最終更新**: 2026-05-09

---

## ER 図（エンティティ関係）

```mermaid
erDiagram
    profiles ||--o{ events : creates
    profiles ||--o{ bookings : books
    profiles ||--o{ follows : follower
    profiles ||--o{ follows : organizer
    profiles ||--o| line_accounts : owns
    profiles ||--o| stripe_settings : owns
    profiles ||--o{ event_admins : "co-admin of"
    profiles ||--o{ event_groups : owns
    profiles ||--o{ group_followers : follows
    profiles ||--o{ user_interest_scores : has
    profiles ||--o{ event_views : views

    events ||--o{ bookings : has
    events ||--o{ reviews : has
    events ||--o{ event_admins : has
    events ||--o{ event_tag_assignments : has
    events ||--o{ event_views : tracked
    events ||--o{ event_messages : sent_in
    events ||--o{ payment_events : logs
    events ||--o{ platform_fees : earns
    events }o--|| event_categories : "categorized as"
    events }o--o| event_groups : "part of series"

    event_categories ||--o{ event_categories : "parent of"
    event_tags ||--o{ event_tag_assignments : "applied via"
    event_tags ||--o{ user_interest_scores : "scored on"

    line_accounts ||--o{ line_followers : has
    line_accounts ||--o{ line_messages : sent_in

    bookings ||--o{ payment_events : "payment status"
    bookings ||--o{ platform_fees : "fee for"
    bookings }o--|| events : for

    event_groups ||--o{ events : contains
    event_groups ||--o{ group_followers : "followed by"

    profiles {
        uuid id PK
        text username UK
        text display_name
        text avatar_url
        text bio
        jsonb sns_links
        boolean is_teacher
        boolean is_admin
        text line_user_id
        text discord_url
        text substack_url
        text youtube_url
        timestamptz created_at
    }

    events {
        uuid id PK
        uuid creator_id FK
        text title
        text description
        timestamptz datetime
        timestamptz booking_deadline
        text location
        text location_type
        int capacity
        int price
        text image_url
        boolean is_published
        text slug UK
        text short_code
        text category
        smallint category_id FK
        uuid group_id FK
        int series_index
        text discord_invite_url
        text substack_url
        text youtube_url
        text slack_invite_url
        boolean is_limited
        text limited_passcode
    }

    bookings {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        text guest_name
        text guest_email
        text guest_phone
        text status "confirmed/cancelled/waitlisted"
        text payment_status "none/pending/paid/failed/refunded"
        text payment_method "stripe/bank/onsite/custom"
        text stripe_session_id
        timestamptz payment_deadline
        timestamptz payment_reminded_at
        text source_utm_source
        text source_utm_campaign
        boolean attended
    }

    follows {
        uuid id PK
        uuid follower_id FK
        uuid organizer_id FK
        boolean notify_email
        boolean notify_line
    }

    event_categories {
        smallint id PK
        text slug UK
        text name
        smallint parent_id FK
        int sort_order
        boolean is_active
    }

    event_tags {
        smallint id PK
        text slug UK
        text name
        text tag_type "format/level/tool/topic"
        boolean is_active
    }

    event_tag_assignments {
        uuid event_id PK
        smallint tag_id PK
    }

    event_views {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        text anon_id
        text referrer
        text utm_source
        text utm_medium
        text utm_campaign
        text user_agent
        timestamptz viewed_at
    }

    user_interest_scores {
        uuid user_id PK
        smallint tag_id PK
        text source PK
        real score
        timestamptz updated_at
    }

    line_accounts {
        uuid id PK
        uuid user_id FK
        text channel_access_token
        text channel_secret
        text bot_user_id
        text bot_basic_id
        text owner_line_user_id
        text_array notify_line_user_ids
        boolean is_active
        boolean notify_on_booking
    }

    stripe_settings {
        uuid id PK
        uuid user_id FK
        text stripe_account_id "acct_xxx"
        text stripe_secret_key "legacy"
        text stripe_webhook_secret
        text connect_mode "legacy/standard/express"
        boolean charges_enabled
        boolean payouts_enabled
        boolean details_submitted
        numeric platform_fee_percent
        int platform_fee_fixed_jpy
    }

    event_groups {
        uuid id PK
        uuid owner_id FK
        text slug UK
        text name
        text description
        smallint category_id FK
        text discord_url
        text substack_url
    }

    platform_fees {
        uuid id PK
        uuid booking_id FK
        uuid event_id FK
        uuid organizer_id FK
        int amount_jpy
        int base_amount_jpy
        numeric fee_percent
        text stripe_session_id
        text stripe_application_fee_id
    }

    payment_events {
        uuid id PK
        uuid booking_id FK
        text event_type
        text stripe_event_id
        jsonb payload
    }

    reviews {
        uuid id PK
        uuid event_id FK
        text reviewer_name
        int rating
        text comment
    }

    event_admins {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        text status "pending/accepted/rejected"
    }
```

---

## 主要データフロー

### A. 予約 → 決済 → 集計

```mermaid
flowchart LR
    User((参加者)) -->|フォーム入力| BookingForm[BookingForm]
    BookingForm -->|POST| BookAPI[/api/events/[id]/book]
    BookAPI -->|INSERT| Bookings[(bookings)]
    BookAPI -->|有料| CheckoutAPI[/api/stripe/checkout]
    CheckoutAPI -->|Direct Charge| Stripe[Stripe Connect]
    Stripe -->|webhook| StripeHook[/api/stripe/webhook]
    StripeHook -->|UPDATE paid| Bookings
    StripeHook -->|INSERT| PayEvents[(payment_events)]
    StripeHook -->|INSERT| Fees[(platform_fees)]

    Bookings -.集計.-> Insights[/dashboard/insights/[id]]
    Fees -.手数料収入.-> Insights
```

### B. 閲覧トラッキング → ファネル分析

```mermaid
flowchart LR
    Visitor((訪問者)) -->|ページ表示| EventPage[/events/[id]]
    EventPage -->|client tracker| ViewAPI[/api/events/[id]/view]
    ViewAPI -->|INSERT| Views[(event_views)]
    Views -.集計.-> Insights[インサイトダッシュボード]
    Bookings[(bookings)] -.集計.-> Insights
    Insights -->|ファネル| Funnel[閲覧UU → 予約 → 決済]
    Insights -->|UTM| Source[流入元別]
    Insights -->|参加者分析| Audience[他カテゴリ嗜好<br/>AIレベル分布]
```

### C. AIシラバス推薦パイプライン

```mermaid
flowchart LR
    Audience[(参加者プロファイル<br/>他参加カテゴリ<br/>AIレベル分布)] -->|集計| AudienceInsights[getAudienceInsights]
    Past[(主催者の過去開催)] -->|抽出| OwnCats[ownCategoryNames]
    AudienceInsights --> Builder[buildAudienceInputForEvent]
    OwnCats --> Builder
    Builder -->|AudienceInput| Claude[Claude Haiku 4.5<br/>messages.parse + Zod schema]
    Claude -->|3 suggestions| UI[SyllabusSuggester]
    UI -->|タイトル/根拠/レベル/形式/時間| Organizer((主催者))
    Organizer -->|採用| NewEvent[/events/new<br/>?title=...]
```

### D. LINE通知マルチキャスト

```mermaid
flowchart LR
    Booking[新規予約] --> BookAPI[/api/events/[id]/book]
    BookAPI -->|notify_line_user_ids 取得| DB[(line_accounts)]
    DB -->|配列| Recipients[管理者A<br/>管理者B<br/>管理者C]
    BookAPI -->|配列が複数なら| Multicast[multicastLineMessage]
    BookAPI -->|1人なら| Push[pushLineMessage]
    Multicast --> Recipients
    Push --> Recipients
```

### E. キャンセル待ち繰り上げ

```mermaid
flowchart LR
    Cancel[予約キャンセル] -->|UPDATE status=cancelled| Bookings[(bookings)]
    Bookings -->|残席計算| Check{capacity > confirmed?}
    Check -->|No| End[終了]
    Check -->|Yes| Promo[promoteWaitlistOnCancellation]
    Promo -->|FIFO取得| Wait[(waitlisted)]
    Wait -->|UPDATE confirmed| Bookings
    Promo -->|メール+LINE| Notify[繰上者・主催者に通知]
```

---

## RLS ポリシーマップ

```mermaid
flowchart LR
    subgraph Public["public access"]
        events_pub[events<br/>is_published=true]
        cats[event_categories<br/>tags<br/>tag_assignments]
        revs[reviews]
    end

    subgraph Auth["authenticated only"]
        own_books[bookings<br/>WHERE user_id=auth.uid<br/>OR event creator]
        own_follow[follows<br/>WHERE follower_id=auth.uid]
        own_int[user_interest_scores<br/>WHERE user_id=auth.uid]
        own_grp[event_groups<br/>WHERE owner_id=auth.uid]
    end

    subgraph Service["service_role only"]
        all_views[event_views]
        all_fees[platform_fees]
        all_pay[payment_events]
        line_acc[line_accounts<br/>line_followers<br/>line_messages]
    end
```

---

## マイグレーション履歴（採番のみ抜粋）

| Migration | 主な変更 |
|---|---|
| `20260320000000_init` | 初期スキーマ |
| `20260328100000_line_accounts` | LINE連携 |
| `20260401100000_create_menus` | 定期メニュー |
| `20260406200000_add_waitlisted_status` | キャンセル待ち |
| `20260420000000_add_stripe_settings` | Stripe（レガシー方式） |
| `20260505000000_add_payment_events` | 決済監査ログ |
| `20260508000000_add_taxonomy` | AI領域カテゴリ・タグ |
| `20260508100000_add_follows` | 主催者フォロー |
| `20260509000000_add_analytics` | 閲覧トラッキング・UTM |
| `20260509100000_add_external_integrations` | Discord/Substack/YouTube |
| `20260509200000_add_groups` | Group/Series機能 |
| `20260509300000_add_multi_admin_notify` | 複数管理者通知 |
| `20260509400000_stripe_connect` | Stripe Connect + 手数料 |

---

*Data Flow / ER Diagram v1.0 — 2026-05-09*
