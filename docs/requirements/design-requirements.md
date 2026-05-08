# petit-event-maker デザイン要件

**バージョン**: 1.0.0
**作成日**: 2026-05-08
**位置づけ**: Phase 2（設計）の入力。`design-system.yml` 生成の元データ
**前提**: 現実装はモノクロ基調（OKLCH白〜黒）のミニマル設計

---

## 1. 美的方向性（Aesthetic Direction）

### 1.1 トーン & ムード

| 軸 | 選択 | 理由 |
|---|---|---|
| **Tone** | `editorial-minimal` | 雑誌・ジャーナルのような落ち着いた情報密度。Peatix（POPで賑やか）の真逆を取る |
| **Mood** | `intelligent-calm` | AI教育者の知的・誠実な世界観に合致。"勉強会感"より"知的サロン感" |
| **Personality** | `quietly-confident` | 派手な装飾に頼らず、タイポと余白で語る |

### 1.2 差別化ステートメント（One-Liner）

> **"The serious place for serious AI learners."**
>
> 賑やかな募集サイトでも、機械的な企業ツールでもない。
> AI領域を真剣に学び・教える人のための、静かで知的な場所。

### 1.3 参照する世界観（Reference Universe）

| 領域 | 参照 | 取り入れる要素 |
|---|---|---|
| 出版 | The New Yorker, MIT Technology Review | エディトリアルなタイポ階層、余白の使い方 |
| プロダクト | Linear, Vercel, Anthropic（公式サイト） | モノクロ + 1色アクセント、明確な情報階層 |
| イベント | Lu.ma | カード密度の高さ、カレンダー一体UI |
| AI領域 | Anthropic Console, OpenAI Platform | 落ち着いた知的トーン、技術者の信頼を得る慎重さ |

### 1.4 避けるトーン（Anti-Direction）

| 避ける | 理由 |
|---|---|
| Peatix的なPOP | 知的層に刺さらない、"飲み会感"が出る |
| connpass的な無機質さ | 企業向けすぎる、温度がない |
| AI画像生成サイト風（紫グラデ、グロウ、ネオン） | "AIっぽい見た目"はAI教育者から逆に避けられる |
| キラキラ装飾系 | 軽く見える、信頼性を損なう |

---

## 2. ブランドガイドライン

### 2.1 カラーパレット

#### 既存（現実装）

```
Background Light: oklch(0.985 0 0)  /* near-white */
Background Dark:  oklch(0.13 0 0)   /* near-black */
Primary:          oklch(0.145 0 0)  /* black */
Foreground:       oklch(0.145 0 0)
Accent:           oklch(0.32 0 0)   /* gray-700 */
```

→ **モノクロのみで色彩アイデンティティが弱い**

#### 提案（新パレット）

| トークン | Light | Dark | 用途 |
|---|---|---|---|
| `--background` | `oklch(0.99 0 0)` | `oklch(0.12 0 0)` | ベース |
| `--foreground` | `oklch(0.18 0 0)` | `oklch(0.96 0 0)` | テキスト |
| `--primary` | `oklch(0.20 0 0)` | `oklch(0.96 0 0)` | 主要ボタン・ヘッダー |
| `--accent` | `oklch(0.62 0.18 35)` 🟧 | `oklch(0.70 0.18 35)` | **シグネチャアクセント（くすんだテラコッタ）** |
| `--muted` | `oklch(0.95 0 0)` | `oklch(0.22 0 0)` | カード背景・区切り |
| `--border` | `oklch(0.90 0 0)` | `oklch(0.28 0 0)` | 罫線 |
| `--success` | `oklch(0.62 0.13 150)` | `oklch(0.70 0.13 150)` | 完了状態 |
| `--warning` | `oklch(0.75 0.15 80)` | `oklch(0.80 0.15 80)` | 注意状態 |
| `--destructive` | `oklch(0.55 0.20 25)` | `oklch(0.60 0.20 25)` | 削除・キャンセル |

#### アクセント選定理由

- **テラコッタ（くすんだオレンジ系）**: Peatixの鮮やかオレンジを避けつつ、温度のある一色を持つ
- **Anthropicブランドの茶系アクセント**との距離感も適切（被りすぎない）
- 紫・青を避ける（AIスロップ・テック汎用感）

#### 禁止カラー組み合わせ

- ❌ 紫 → 青の線形グラデーション（AI生成画像によくある）
- ❌ ネオンカラー（パステル除く）
- ❌ ピュアブラック（`#000`）→ `oklch(0.12 0 0)` まで
- ❌ ピュアホワイト（`#FFF`）→ `oklch(0.99 0 0)` まで

### 2.2 タイポグラフィ

#### 提案フォント

| 用途 | 候補 | 代替 |
|---|---|---|
| 見出し（heading） | **Instrument Serif**（Latin）+ **Noto Serif JP**（日本語） | Playfair Display |
| 本文（body） | **Geist Sans**（Latin）+ **Noto Sans JP**（日本語） | system-ui |
| 等幅（mono） | **JetBrains Mono** | Geist Mono |
| 数値（金額・統計） | `font-feature-settings: "tnum"` 適用 | — |

#### 禁止フォント

- ❌ **Inter**（AIスロップの代名詞）
- ❌ **Roboto**, **Arial**（無個性）
- ❌ **Helvetica Neue**（汎用すぎ）
- ❌ Comic Sans 系（言うまでもなく）

#### タイポ階層

| 要素 | フォント | サイズ | 行間 | weight |
|---|---|---|---|---|
| Display (H1 ヒーロー) | Instrument Serif | 3.5rem (mobile: 2.25rem) | 1.1 | 400 |
| H2 | Instrument Serif | 2.25rem | 1.2 | 400 |
| H3 | Geist Sans | 1.5rem | 1.3 | 600 |
| H4 | Geist Sans | 1.25rem | 1.4 | 600 |
| Body | Geist Sans | 1rem | 1.7 | 400 |
| Small | Geist Sans | 0.875rem | 1.5 | 400 |
| Caption | Geist Sans | 0.75rem | 1.4 | 500 |

#### タイポ運用ルール

- **見出しはセリフ、本文はサンセリフ** — エディトリアルらしさを出す
- **`text-balance`** を全見出しに適用（折返しの美しさ）
- **`tabular-nums`** を全数値に適用（金額・参加者数・日時）
- **行長**: 本文は最大 65ch
- **大文字化禁止**: `text-transform: uppercase` は使わない（`small-caps` も避ける）

### 2.3 アイコン

| 項目 | 選択 |
|---|---|
| ライブラリ | `lucide-react`（既存維持） |
| サイズ | `16px` (inline) / `20px` (button) / `24px` (action) |
| カラー | `currentColor` 継承 |
| 装飾的アイコン禁止 | 機能を持たないアイコンは使わない（情報密度を下げる） |

---

## 3. レイアウト & 余白

### 3.1 レイアウト原則

1. **余白こそ主役** — 詰め込まない、呼吸させる
2. **左揃え基本** — 中央揃えは見出しと小要素のみ
3. **8pxグリッド** — すべての余白・サイズは8の倍数
4. **コンテンツ幅** — 本文最大 720px、リスト最大 1200px、画像はフル幅可

### 3.2 スペーシングスケール（8px base）

| トークン | 値 | 主用途 |
|---|---|---|
| `xs` | 4px | アイコン-テキスト間 |
| `sm` | 8px | コンパクト間隔 |
| `md` | 16px | 標準間隔 |
| `lg` | 24px | セクション内 |
| `xl` | 32px | コンポーネント間 |
| `2xl` | 48px | セクション間 |
| `3xl` | 64px | セクション大区切り |
| `4xl` | 96px | ページ上下マージン |

### 3.3 ボーダー & 角丸

| トークン | 値 | 用途 |
|---|---|---|
| `radius-none` | 0 | テーブル等の角ばった要素 |
| `radius-sm` | 4px | バッジ・タグ |
| `radius-md` | 8px | ボタン・入力欄 |
| `radius-lg` | 12px | カード |
| `radius-xl` | 20px | モーダル・ヒーロー画像 |
| `radius-full` | 9999px | アバター・ピル |

過剰な角丸は禁止（AIプロダクトでよくある"ぷっくり感"を避ける）

### 3.4 シャドウ

| トークン | 用途 |
|---|---|
| `shadow-sm` | カードのホバー時のみ |
| `shadow-md` | ドロップダウン・ポップオーバー |
| `shadow-lg` | モーダル |
| `shadow-glow` | ❌ 禁止（AIスロップ） |

---

## 4. UIコンポーネント方針

### 4.1 ライブラリ

| カテゴリ | 採用 |
|---|---|
| プリミティブ | **shadcn/ui**（既存維持） |
| スタイリング | **Tailwind CSS v4**（既存維持） |
| アニメーション | **motion/react** |
| アイコン | **lucide-react** |
| フォーム | **react-hook-form + zod**（既存維持） |
| 日付 | `date-fns` + 日本語ロケール |
| グラフ | `recharts` or `tremor`（ダッシュボード用、要選定） |

### 4.2 コンポーネント原則

1. **shadcn/uiを優先**、ない場合のみ独自実装
2. **構成は Compound Component パターン** を基本
3. **クライアント分割** — `"use client"` は最小限、Server Component優先
4. **propsは最小**、必要に応じてVariantで分岐（cva使用）

### 4.3 主要コンポーネントの差別化方針

| コンポーネント | デザイン方針 |
|---|---|
| Button | 角丸 8px、塗り/枠線/ゴーストの3種類。グラデーション禁止 |
| EventCard | カード影は弱め、ホバーで微小に浮く。画像は4:3、上部配置 |
| Calendar | 月ビューは罫線最小、イベントは色付きドット |
| ExploreFilter | サイドバーではなくトップに横並びチップ |
| Hero (LP) | セリフフォント大見出し + 余白多め、装飾画像を入れない |

---

## 5. アニメーション & インタラクション

### 5.1 原則

1. **目的のあるアニメーションのみ** — 装飾アニメは禁止
2. **200ms以下** — それ以上は重く感じる
3. **Compositorプロパティのみ** — `transform` / `opacity`、レイアウトプロパティは禁止
4. **`prefers-reduced-motion` に必ず対応**

### 5.2 イージング

| 用途 | カーブ |
|---|---|
| エンター（fade in） | `cubic-bezier(0.16, 1, 0.3, 1)` |
| エグジット（fade out） | `cubic-bezier(0.7, 0, 0.84, 0)` |
| ホバー | `ease-out` 150ms |
| ボタンプレス | `ease-in` 100ms |

### 5.3 禁止インタラクション

- ❌ パーティクル背景
- ❌ マウスストーカー
- ❌ 大規模なパララックス
- ❌ `scroll-driven` で動く重い要素
- ❌ ローディングスピナーの過剰使用（スケルトン優先）

---

## 6. レスポンシブ方針

### 6.1 アプローチ

**Mobile First** — モバイル中心設計、PC は拡張版

### 6.2 ブレークポイント（Tailwind準拠）

| サイズ | 幅 | 想定デバイス |
|---|---|---|
| `sm` | 640px | 大型スマホ |
| `md` | 768px | タブレット縦 |
| `lg` | 1024px | タブレット横 / 小型ノートPC |
| `xl` | 1280px | デスクトップ |
| `2xl` | 1536px | 大型デスクトップ |

### 6.3 主要ページのレスポンシブ要件

| ページ | モバイル | デスクトップ |
|---|---|---|
| `/explore` | 1列カード | 3列カード（lg以上） |
| `/events/[id]` | 縦スクロール一体型 | 左カラム本文 + 右カラム予約パネル sticky |
| `/[username]` | 縦並びイベント | グリッド |
| `/my` | タブで履歴/予約切替 | サイドバー + メイン |
| `/menus/[id]/bookings` | 縦テーブル | 横スクロール対応テーブル |

### 6.4 タッチ要件

- 全インタラクティブ要素 **44px以上**
- スワイプ操作は破壊的アクションには使わない
- フォームのキーボード型は適切に指定（`type="email"` `inputmode="numeric"` 等）

---

## 7. ダークモード

| 項目 | 方針 |
|---|---|
| 対応 | **対応必須**（`prefers-color-scheme: dark`） |
| 切替 | システム設定追従 + 手動切替（ヘッダーにトグル） |
| 切替UI | アイコンのみのトグル（`Sun`/`Moon`） |
| カラー反転 | 上記カラー定義のDarkカラム参照 |

---

## 8. アクセシビリティ要件

> 詳細は `non-functional.md` 第6章参照

- WCAG 2.1 AA 準拠
- コントラスト比 4.5:1 以上
- フォーカス輪郭は必ず視認可能に
- スクリーンリーダー対応（aria-label、ランドマーク、見出し階層）
- `prefers-reduced-motion` 対応

---

## 9. 品質基準（実装後検証）

| 項目 | 基準 | 検証 |
|---|---|---|
| Lighthouse Performance | 90+ | CI |
| Lighthouse Accessibility | 100 | CI |
| Lighthouse Best Practices | 100 | CI |
| Lighthouse SEO | 100 | CI |
| Core Web Vitals | LCP<2.5s, CLS<0.1, INP<200ms | Vercel Analytics |
| 禁止フォント検出 | 0件 | grep |
| `dangerouslySetInnerHTML` | 0件（やむを得ない場合DOMPurify） | grep |
| `console.log` 残置 | 0件（本番ビルド） | lint |

---

## 10. デザインアンチパターン（絶対やらない）

| カテゴリ | 禁止内容 |
|---|---|
| フォント | Inter / Roboto / Arial / Helvetica Neue |
| カラー | 紫 → 青のグラデーション、ネオン、ピュアブラック/ホワイト |
| エフェクト | グロウ、過剰なドロップシャドウ、blur多用 |
| アニメーション | パーティクル、マウスストーカー、無意味な動き、200ms超 |
| レイアウト | 中央揃え多用、装飾画像、AIロゴ風シンボル |
| 文言 | 「次世代」「革新的」「AIで○○」等の自己賞賛 |
| アイコン | ぷっくり3Dアイコン、AI生成風アイコン |

---

## 11. デザインシステム生成への接続

このドキュメントを入力として、Phase 2で以下を生成:

- `docs/design/design-system.yml` — トークン化されたデザインシステム
- `docs/design/ui-guidelines.md` — UI設計指針
- `docs/design/component-library.md` — shadcn/ui利用設定
- `docs/design/responsive-guidelines.md` — レスポンシブ詳細
- `docs/design/component-specs/` — 個別コンポーネント仕様

---

*petit-event-maker Design Requirements v1.0 — 2026-05-08*
