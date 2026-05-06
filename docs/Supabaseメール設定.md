# Supabase メールテンプレート設定

サインアップ確認メールが「Supabase Auth」名義で届くため、ユーザーがアプリのメールと気付かず確認リンクを踏まないケースが多い。
以下のテンプレートを Supabase Dashboard に登録することで「プチイベント作成くん」名義の日本語メールに差し替える。

## 設定箇所

Supabase Dashboard → 該当プロジェクト → **Authentication** → **Email Templates**

## 1. Confirm signup（サインアップ確認）

### Subject

```
【プチイベント作成くん】メールアドレスの確認をお願いします
```

### Message body (HTML)

```html
<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="font-size: 20px; margin: 0 0 16px;">プチイベント作成くんへのご登録ありがとうございます</h2>
  <p style="font-size: 14px; line-height: 1.7; margin: 0 0 20px;">
    下のボタンからメールアドレスの確認を完了してください。<br>
    確認が完了すると、ダッシュボードからイベントを作成できるようになります。
  </p>
  <p style="margin: 24px 0;">
    <a href="{{ .ConfirmationURL }}"
       style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 28px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 14px;">
      メールアドレスを確認する
    </a>
  </p>
  <p style="font-size: 12px; color: #666; line-height: 1.7; margin: 16px 0 0;">
    ボタンが押せない場合は、以下のURLをブラウザに貼り付けてアクセスしてください。<br>
    <a href="{{ .ConfirmationURL }}" style="color: #1a1a1a; word-break: break-all;">{{ .ConfirmationURL }}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0 16px;">
  <p style="font-size: 11px; color: #999; line-height: 1.6; margin: 0;">
    このメールに心当たりがない場合は、お手数ですが破棄してください。<br>
    プチイベント作成くん — 友達と仲間内のイベント作成サービス
  </p>
</div>
```

## 2. Magic Link / Reset Password など他テンプレも同様に和訳推奨

| テンプレ | 推奨 Subject |
|---------|--------------|
| Reset Password | 【プチイベント作成くん】パスワード再設定のお知らせ |
| Magic Link | 【プチイベント作成くん】ログインリンクのお知らせ |
| Change Email Address | 【プチイベント作成くん】メールアドレス変更のご確認 |
| Invite user | 【プチイベント作成くん】〇〇さんから招待が届いています |

## 3. 差出人名・差出人アドレスの変更

`noreply@mail.app.supabase.io` のままだと迷惑メール判定されやすい。
独自ドメインから送るには **SMTP 設定** が必要。

### 設定箇所

Supabase Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**

### 推奨: Resend を使う

このプロジェクトは既に `resend` パッケージを利用しているため、同じ Resend アカウントの SMTP 認証情報を流用できる。

| 項目 | 値 |
|------|-----|
| Host | `smtp.resend.com` |
| Port | `465`（TLS）または `587` |
| Username | `resend` |
| Password | Resend ダッシュボードで発行した API キー |
| Sender email | `noreply@<your-domain>`（Resend で verify 済みのドメイン） |
| Sender name | `プチイベント作成くん` |

### Resend 側の準備

1. Resend ダッシュボード → Domains → 独自ドメインを追加 & DNS verify
2. API Keys → SMTP 用キーを発行
3. 上記 SMTP 設定に貼り付け

設定後、確認メールの差出人が `プチイベント作成くん <noreply@your-domain>` になり、件名にもアプリ名が入るためユーザーが気付きやすくなる。

## 動作確認

1. シークレットウィンドウで新規登録
2. 受信箱で件名「【プチイベント作成くん】〜」のメールを確認
3. 本文のボタンをクリック → ダッシュボードへ遷移できれば OK

## 既知の注意点

- Supabase 標準 SMTP は流量制限あり（時間あたり送信数）。本番では Resend SMTP 必須
- HTML テンプレートの `{{ .ConfirmationURL }}` は Supabase 側のプレースホルダー。改名・削除しないこと
- 件名・本文を変更しても、過去に送信済みのメールは差し替わらない
