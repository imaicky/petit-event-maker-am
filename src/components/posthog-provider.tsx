"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { useAuth } from "@/components/auth-provider";

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    if (!key) return;
    if (typeof window === "undefined") return;
    if (posthog.__loaded) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      person_profiles: "identified_only",
    });
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </>
  );
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;
    if (!posthog.__loaded) return;
    const url = `${window.location.origin}${pathname}${
      searchParams?.toString() ? `?${searchParams.toString()}` : ""
    }`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined" || !posthog.__loaded) return;
    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        provider: user.app_metadata?.provider ?? "email",
        name: profile?.display_name ?? undefined,
      });
    } else {
      posthog.reset();
    }
  }, [user, profile]);

  return null;
}
