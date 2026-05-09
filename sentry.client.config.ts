import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // 本番では10%サンプリング、preview/devでは100%
    tracesSampleRate:
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? 0.1 : 1.0,
    // Session Replay は10%（重い）
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 0.1,
    // PIIフィルタリング
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
      }
      return event;
    },
    ignoreErrors: [
      // ブラウザ拡張・広告ブロックのノイズ
      /ResizeObserver/,
      /Non-Error promise rejection captured/,
      /Network request failed/,
    ],
  });
}
