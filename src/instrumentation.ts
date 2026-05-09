export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(
  err: unknown,
  request: Request,
  context: unknown
) {
  if (
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN
  ) {
    const Sentry = await import("@sentry/nextjs");
    // captureRequestError は型がランタイムに依存するため緩く扱う
    const captureFn = (Sentry as unknown as {
      captureRequestError?: (
        err: unknown,
        request: Request,
        context: unknown
      ) => void;
    }).captureRequestError;
    captureFn?.(err, request, context);
  }
}
