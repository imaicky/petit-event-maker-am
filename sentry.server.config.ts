import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate:
      process.env.VERCEL_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      // 機密性の高いキーをマスク
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        delete h.authorization;
        delete h.cookie;
        delete h["x-api-key"];
      }
      return event;
    },
  });
}
