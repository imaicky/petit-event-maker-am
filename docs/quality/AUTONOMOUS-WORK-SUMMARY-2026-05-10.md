# 🌙 自律監査作業サマリー（あゆみさん睡眠中）

**期間**: 2026-05-09 23:30 〜 2026-05-10 03:00 (JST)
**作業内容**: adversarial security audit + バグ修正

---

## 📊 結論

**11件の本物のバグを発見・修正し、すべて本番デプロイ済み。**

| Severity | 件数 | 内容 |
|---|---|---|
| 🔴 CRITICAL | 1 | cancel API 認可漏れ |
| 🟠 HIGH | 4 | race condition x2, form method, session競合 |
| 🟡 MEDIUM | 5 | cron fail-open, open redirect, fillTemplate, email大小, 画像拡張子 |
| 🟢 LOW | 1 | inferAiLevel ガード |

詳細: `docs/quality/adversarial-audit-2026-05-10.md`

---

## 🚨 起床後・最優先で対応してほしい3つ

### 1. Stripe Connect Webhook の登録（要user作業）
**Direct Charge では決済 webhook が接続アカウント側に届く**ため、プラットフォームの `/api/stripe/webhook` には届かない可能性が高い。

**対応**:
1. Stripe Dashboard → Connect → Webhooks（**Settings → Webhooks ではない**）
2. Endpoint URL: `https://petit-event-maker-am.vercel.app/api/stripe/webhook`
3. Listen to: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`, `application_fee.created`
4. 取得した webhook secret を Vercel 環境変数 `STRIPE_WEBHOOK_SECRET` に追加

これがないと Connect モードの決済が `payment_status='pending'` のまま固まります。

### 2. 未適用マイグレーション5本の Supabase 反映
- `20260509100000_add_external_integrations`
- `20260509200000_add_groups`
- `20260509300000_add_multi_admin_notify`
- `20260509400000_stripe_connect`
（既適用: `20260509000000_add_analytics`）

URL: https://supabase.com/dashboard/project/xbzzknfscifuyuhmhuam/sql

### 3. Vercel 環境変数の追加
```
NEXT_PUBLIC_SENTRY_DSN     # Sentry エラー追跡
SENTRY_DSN                 # 同上 (server side fallback)
ANTHROPIC_API_KEY          # AI生成シラバス推薦
STRIPE_CONNECT_CLIENT_ID   # Connect連携 ca_xxx
STRIPE_SECRET_KEY          # プラットフォームのSecret sk_xxx
STRIPE_WEBHOOK_SECRET      # Connect webhook用
CRON_SECRET                # 任意のランダム文字列 (未設定だと payment-reminders cron が動かない)
```

---

## 🐛 修正したバグの詳細（11件）

### 🔴 CRITICAL

**バグ6**: `/api/events/[id]/cancel` が認可なしで誰でも予約キャンセル可能だった
- 攻撃: `booking_id` を入手すれば任意の予約をキャンセル可能
- 修正: 予約者本人 (user_id一致 or guest_email一致) または canManageEvent のみ許可
- commit: `cb44623`

### 🟠 HIGH

**バグ3**: イベント予約 capacity check の TOCTOU race condition
- 修正: post-insert で confirmed数を再確認し、超過時は最後発を waitlisted に降格
- commit: `cdd62e6`

**バグ4**: GroupFollowButton で `<form method="DELETE">` が動作不能
- HTMLフォームは GET/POST のみ対応、DELETEはGETにフォールバック
- 修正: 専用クライアントコンポーネント `<GroupFollowButton>` で fetch DELETE
- commit: `cdd62e6`

**バグ7**: メニュー予約も同じ race condition
- 修正: 同様の post-check 防御。menuには waitlist がないので cancelled に降格
- commit: `ad488bf`

**バグ9**: Stripe再決済リンクの session_id 競合
- 古いセッション期限切れwebhookで「新規session支払い直前」の予約が誤キャンセルされる
- 修正: 新セッション作成時に bookings.stripe_session_id を更新 + webhook側でID一致確認
- commit: `8fbfefc`

### 🟡 MEDIUM

**バグ5**: `/api/cron/payment-reminders` が CRON_SECRET 未設定時に fail-open
- 修正: secret 必須に変更（fail-closed）
- commit: `cb44623`

**バグ8**: `/api/auth/callback?next=...` で next 未検証 (Open Redirect)
- 修正: next が `/` 始まりで `//` `://` を含まない場合のみ許可
- commit: `f34ca42`

**バグ2**: `fillTemplate` の cascading replacement (XSS/spoofing)
- ユーザーがイベントタイトルに `{eventUrl}` と書くと URL が表示される偽装可能
- 修正: 単一パスの正規表現置換
- commit: `f57fa83`

**バグ10**: 予約のメール重複チェックが大文字小文字を区別
- `JOHN@example.com` と `john@example.com` を別人扱い → 二重予約可能
- 修正: zod schema で `.transform((s) => s.trim().toLowerCase())`
- commit: `39fa149`

**バグ11**: 画像アップロードでクライアント由来の拡張子を使用
- 修正: `contentType` から拡張子を導出 + `Math.random` → `crypto.randomUUID`
- commit: `39fa149`

### 🟢 LOW

**バグ1**: `inferAiLevel` の不正入力ガード不在
- 負値・NaN・Infinity を渡すと予期せぬレベルを返す
- 修正: `!Number.isFinite || <= 0` で `'未参加'` 縮退
- commit: `f57fa83`

---

## 📈 テストカバレッジ

```
       BEFORE    AFTER
テスト  62件     217件   (+155, 3.5倍)
カバレッジ  8.27%  →  28.7%
分岐    4.52%  →  21.7%
関数   10.60%  →  34.5%
```

新規テスト追加（合計155件）:
- `analytics.test.ts`, `feed.test.ts`, `user-history.test.ts`, `validations.test.ts`
- `email-templates.test.ts`, `line.test.ts`, `calendar.test.ts`, `utils.test.ts`
- `constants.test.ts`, `templates.test.ts`, `short-code.test.ts`
- `stripe-connect.test.ts`, `syllabus-suggest.test.ts`, `check-event-access.test.ts`
- `follows.test.ts`, **`adversarial.test.ts`** (バグ発見用)

---

## 🤔 修正せず記録した既知の制限事項

| 領域 | 制限 | 備考 |
|---|---|---|
| 予約 race condition | post-check は完全防御ではない（< 100ms 内 3+並列で漏れる可能性） | 根本解決には Postgres RPC + SELECT FOR UPDATE |
| Rate limiting | 全エンドポイントで未実装 | Redis/KV 導入必要、別途検討 |
| Reviews 投稿 | 認証不要・参加実績不問（design choice） | 「参加者のみレビュー可」フラグ追加検討 |
| Stripe Connect Direct Charge webhook | 接続アカウント webhook の登録が必要 | 上記 起床後対応 #1 を実施 |

---

## 📦 コミット履歴（時刻順）

```
cbcc40e docs(audit): バグ11件の最終版＋既知制限事項を明記
39fa149 fix(security): 追加バグ2件 - email大小バイパス + 画像アップロード拡張子
d43ebcc docs(audit): バグ9件目（Stripe session競合）も追加し最終版
8fbfefc fix(security): バグ9 - Stripe再決済リンクの session_id 競合を解消
46ba2e5 docs: adversarial audit レポート（バグ8件発見・全修正済み）
f34ca42 fix(security): Open Redirect脆弱性の防御を追加
ad488bf fix(security): メニュー予約にも同じTOCTOU race防御を適用
cb44623 fix(security): 重大バグ2件追加修正 - cancel認可漏れ + cron fail-open
cdd62e6 fix: race condition (book) + group follow button (form method=DELETE works)
f57fa83 fix(security): adversarial test で2件の本物バグを発見＆修正
```

すべて本番デプロイ済み。217テスト全PASS。

---

## 💌 起床後にやること（再掲・チェックリスト）

- [ ] このサマリーを読む
- [ ] `docs/quality/adversarial-audit-2026-05-10.md` でバグ詳細を確認
- [ ] Stripe Connect Webhook を **Connect用** で登録
- [ ] 未適用マイグレーション5本を Supabase に反映
- [ ] Vercel 環境変数を追加（特に `STRIPE_WEBHOOK_SECRET` と `CRON_SECRET`）
- [ ] 動作確認: テスト主催者として一連のフロー（予約→決済→キャンセル）を試す

おはようございます。ぐっすり眠れましたか？☀️

— Claude
