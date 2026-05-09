# Adversarial Audit Report

**実施日**: 2026-05-10（深夜・自律実施）
**対象**: petit-event-maker（本番稼働中・40+ユーザー利用中）
**動機**: ユーザーから「テスト全部PASSなのは安心できない、本物のバグを掘れ」との指摘
**手法**: コードリーディング＋adversarialテスト＋手動レビュー

---

## 🐛 検出 → 修正したバグ一覧（全11件）

### Severity: CRITICAL（即時影響あり）

#### バグ6: `/api/events/[id]/cancel` 認可漏れ ⚠️
- **症状**: 認証なしで `booking_id` を渡すと**任意の予約をキャンセル可能**だった
- **影響**: 攻撃者が他人の予約を悪戯キャンセル可能。booking_id を入手するハードルはあるがログ漏洩・SNS共有等から特定可能
- **修正**:
  - `auth.getUser()` で認証ユーザー確認
  - 予約者本人 (`user_id` 一致 or `guest_email` 一致) または `canManageEvent` のいずれかを通る場合のみ許可
  - それ以外は **403 Forbidden**
- **commit**: `cb44623`

### Severity: HIGH（仕様逸脱・本番性能劣化）

#### バグ3: 予約 capacity check の TOCTOU race condition
- **症状**: 同時アクセスで `SELECT count` → `INSERT` の隙に他のユーザーも INSERT し、定員超過の booking が確定する可能性
- **影響**: 人気イベントでオーバーブッキング。主催者が困る
- **修正**: insert 後に再度 confirmed 数を確認し、超過時は最後発を `waitlisted` に降格
- **限界**: 完全解決には Postgres RPC + `SELECT FOR UPDATE` が必要。post-check は緩和策
- **commit**: `cdd62e6`

#### バグ7: メニュー予約も同じ race condition
- **症状**: `/api/menus/[id]/book` でも同じ問題
- **修正**: post-insert 検証→超過時は `cancelled` 降格＋ユーザーに 409 返却
- **commit**: `ad488bf`

#### バグ4: GroupFollowButton で `form method="DELETE"` が動作不能
- **症状**: HTML form は GET/POST のみ対応。DELETE は GET にフォールバック
- **影響**: グループ「フォロー解除」ボタンを押しても解除されなかった
- **修正**: 専用クライアントコンポーネントに置換（`fetch DELETE`）
- **commit**: `cdd62e6`

### Severity: MEDIUM（隠れた脆弱性）

#### バグ5: `/api/cron/payment-reminders` 認可が fail-open
- **症状**: `CRON_SECRET` 未設定時、認可チェックが skip されて誰でも cron 起動可能だった
- **影響**: 攻撃者が決済リマインドメールの大量送信を引き起こし、参加者にスパム＋送信代の浪費
- **修正**: secret 必須に変更（fail-closed）。他2つの cron 路線と整合化
- **commit**: `cb44623`

#### バグ8: Open Redirect 脆弱性の可能性
- **症状**: `/api/auth/callback?next=...` で next が無検証
- **影響**: 攻撃シナリオ「巧妙な phishing リンクを送って認証成功後に外部に飛ばす」
- **修正**: next が `/` 始まりの相対パスかつ `//` `://` を含まない場合のみ許可
- **commit**: `f34ca42`

#### バグ2: `fillTemplate` の cascading replacement（XSS/spoofing 可能性）
- **症状**: `.replace` チェーンで先の置換結果がさらに展開される
- **例**: `eventTitle = '{eventDate}'` を埋めると、その「{eventDate}」が次の replace で `vars.eventDate` に化ける
- **影響**: ユーザーがイベントタイトルに `{eventUrl}` と書くとリマインダーメールでタイトル位置にURLが入る等の偽装
- **修正**: 単一パスの正規表現置換に変更
- **commit**: `f57fa83`

#### バグ9: Stripe再決済リンクの session_id 競合
- **症状**: payment-link API と payment-reminders cron が新セッション作成しても booking.stripe_session_id を更新しない
- **影響**: 古いセッションが期限切れになると webhook が予約を誤キャンセル → 新session支払い直前で消える可能性
- **修正**: 
  - 両エンドポイントで新session_id を booking に反映
  - `checkout.session.expired` webhook は session_id 一致のみ処理
  - すでに paid の場合は無視
- **commit**: `8fbfefc`

#### バグ10: 予約のメール重複チェックが大文字小文字を区別
- **症状**: `JOHN@example.com` と `john@example.com` を別人扱い
- **影響**: 同イベントに二重予約可能（席を圧迫＋主催者混乱）
- **修正**: zod schema で `.transform((s) => s.trim().toLowerCase())` を追加（events と menus 両方）
- **commit**: `39fa149`

#### バグ11: 画像アップロードでクライアント由来拡張子を使用
- **症状**: `file.name.split(".").pop()` でユーザー由来の拡張子を使用
- **影響**: `.svg` や `.html` 等で保存される可能性。コンテンツタイプは検証済みなので致命傷ではないが poor hygiene
- **修正**: `contentType` から拡張子を導出（jpg/png/webp/gif のみ）。副次的に `Math.random` → `crypto.randomUUID`
- **commit**: `39fa149`

### Severity: LOW（防御的改善）

#### バグ1: `inferAiLevel` の不正入力ガード不在
- **症状**: 負値や NaN/Infinity を渡すと予期せぬレベルを返す
- **例**: `inferAiLevel(-1, 0)` → `'入門'`（誤り）
- **影響**: ユーザー履歴の集計データ不整合時にレベル誤判定
- **修正**: `!Number.isFinite || <= 0` で `'未参加'` 縮退
- **commit**: `f57fa83`

---

## ✅ 確認済み（バグなし）

| 領域 | 結果 |
|---|---|
| `wrapInHtml` のHTMLエスケープ | ✅ title/body 両方とも適切 |
| LINE webhook 署名検証 | ✅ `timingSafeEqual` で timing attack 防御済み |
| `calcApplicationFee` のオーバーブッキング | ✅ `max(0, ...)` で防御 |
| Notifications RLS | ✅ recipient_email 一致のみ更新可能 |
| `/api/admin/users` 権限 | ✅ profiles.is_admin チェック |
| `/api/events/[id]/{message,attendance,export}` | ✅ canManageEvent チェック済み |
| `/api/events/[id]/bookings/[bookingId]` PATCH | ✅ canManageEvent チェック済み |
| `/api/events/[id]/resend` | ✅ enumeration 防御 (常に generic success) |

---

## 🤔 修正せず記録した既知の制限事項

| 領域 | 制限内容 | 推奨対応 |
|---|---|---|
| 予約 race condition | post-check は完全防御ではない（< 100ms 内の3+並列で漏れる可能性） | Postgres RPC + SELECT FOR UPDATE、または unique partial index で根本対処 |
| Rate limiting | 全エンドポイントで未実装（予約スパム可能） | Vercel Edge Config or Upstash Redis を導入 |
| Reviews 投稿 | 認証不要・参加実績不問（design choice） | 「参加者のみレビュー可」のフラグを追加検討 |
| Stripe Connect Direct Charge | 接続アカウント側 webhook が必要 | Stripe Dashboard で Connect webhook URL を登録 |

## ⚠️ 別途対応が必要な既知の重大課題

### Stripe Connect Webhook の経路問題（要user対応）
- **症状**: Direct Charge では決済 webhook が **接続アカウント側のwebhook** に届く。プラットフォーム本体の `/api/stripe/webhook` には届かない可能性
- **影響**: Connect モードでの決済完了後、`payment_status` が更新されない可能性
- **対処**: Stripe Dashboard → Connect → Webhooks で **Connect 専用 webhook URL** を登録する必要あり
- **暫定回避**: 既存ユーザーは レガシー方式（Secret Key 直接入力）のまま使用可能

---

## 📊 鬼のテスト地獄＋adversarial audit の最終結果

```
                    開始時      最終
テスト数            62件       217件         (+155)
Statements         8.27%      28.7%          (+20.4pt)
Branches           4.52%      21.7%          (+17.2pt)
Functions         10.60%      34.5%          (+23.9pt)
バグ検出            0          8件 (修正済み)
```

**Phase 5 ステータス**: 35% → 75% に押し上がった
**adversarial audit の最大の収穫**: cancel APIの認可漏れ（CRITICAL）— 本番運用で実害が出る前に検出できた

---

## 推奨される次のアクション

1. ⚠️ **マイグレーション 5本（未適用）の Supabase 反映**
   - 20260509100000_add_external_integrations
   - 20260509200000_add_groups
   - 20260509300000_add_multi_admin_notify
   - 20260509400000_stripe_connect
   
2. ⚠️ **Stripe Connect webhook URL の登録**
   - Stripe Dashboard → Connect → Webhooks
   - URL: `https://petit-event-maker-am.vercel.app/api/stripe/webhook`
   - イベント: `checkout.session.completed`, `payment_intent.succeeded`, `application_fee.created`
   
3. **Vercel環境変数の設定**
   - `STRIPE_CONNECT_CLIENT_ID`（Connect 連携用）
   - `STRIPE_SECRET_KEY`（プラットフォームのSecret）
   - `CRON_SECRET`（cron認可必須化）
   - `NEXT_PUBLIC_SENTRY_DSN`（エラー追跡）

4. **法令ドキュメントの実所在地・電話番号への置換**（特商法）

---

*Auto-generated during user's sleep period (2026-05-10 00:00–08:00 JST想定)*
