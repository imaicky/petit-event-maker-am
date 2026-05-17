"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; code?: string }>;
  signUpWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signInWithLINE: () => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithTwitter: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  isLoading: true,
  signInWithPassword: async () => ({ error: null }),
  signUpWithPassword: async () => ({ error: null }),
  signInWithLINE: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signInWithTwitter: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  resendConfirmationEmail: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!error && data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signInWithPassword = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: string | null; code?: string }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message, code: error.code };
      return { error: null };
    },
    [supabase]
  );

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: string | null; needsEmailConfirmation?: boolean }> => {
      const callbackUrl = `${window.location.origin}/api/auth/callback?next=/dashboard`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });
      if (error) return { error: error.message };
      // Supabase returns user with empty identities array when email confirmation is required
      const needsEmailConfirmation =
        !!data.user && (data.user.identities?.length ?? 0) === 0;
      return { error: null, needsEmailConfirmation: needsEmailConfirmation || !data.session };
    },
    [supabase]
  );

  const resendConfirmationEmail = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      const callbackUrl = `${window.location.origin}/api/auth/callback?next=/dashboard`;
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    [supabase]
  );

  const signInWithLINE = useCallback(async (): Promise<{
    error: string | null;
  }> => {
    // Preserve current path so user returns here after LINE OAuth
    const currentPath = window.location.pathname + window.location.search;
    const callbackUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(currentPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "custom:line" as never,
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, [supabase]);

  const signInWithGoogle = useCallback(async (): Promise<{
    error: string | null;
  }> => {
    const currentPath = window.location.pathname + window.location.search;
    const callbackUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(currentPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, [supabase]);

  const signInWithTwitter = useCallback(async (): Promise<{
    error: string | null;
  }> => {
    const currentPath = window.location.pathname + window.location.search;
    const callbackUrl = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(currentPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: { redirectTo: callbackUrl },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/api/auth/callback?next=/auth/reset-password",
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signInWithPassword,
        signUpWithPassword,
        signInWithLINE,
        signInWithGoogle,
        signInWithTwitter,
        resetPassword,
        resendConfirmationEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
