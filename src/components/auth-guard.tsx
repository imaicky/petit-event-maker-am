"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface AuthGuardProps {
  children: ReactNode;
  /** Where to redirect if not logged in. Defaults to "/" */
  redirectTo?: string;
  /** Optional fallback to render instead of redirecting */
  fallback?: ReactNode;
}

/**
 * Wraps protected pages/sections.
 * - While auth state is loading: shows a centered spinner.
 * - If not logged in: redirects to `redirectTo` (default: "/").
 * - If logged in: renders `children`.
 */
export function AuthGuard({
  children,
  redirectTo = "/",
  fallback,
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      if (!fallback) {
        router.replace(redirectTo);
      }
    }
  }, [user, isLoading, router, redirectTo, fallback]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Redirect is happening via useEffect; render nothing in the meantime
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
      </div>
    );
  }

  return <>{children}</>;
}
