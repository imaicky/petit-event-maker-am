"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { MyBookingsClient, type BookingItem } from "./my-bookings-client";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

export default function MyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setBookingsLoading(true);
    try {
      const supabase = createClient();

      // Fetch bookings where user_id matches (or guest_email matches user email)
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select("id, event_id, status, created_at, guest_email")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !bookingsData || bookingsData.length === 0) {
        setBookings([]);
        return;
      }

      // Fetch events for these bookings
      const eventIds = [...new Set(bookingsData.map((b) => b.event_id))];
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, datetime, location, slug")
        .in("id", eventIds);

      const eventMap: Record<string, { id: string; title: string; datetime: string; location: string | null; slug: string }> = {};
      for (const e of eventsData ?? []) {
        eventMap[e.id] = e;
      }

      const items: BookingItem[] = bookingsData
        .filter((b) => eventMap[b.event_id])
        .map((b) => ({
          id: b.id,
          event_id: b.event_id,
          status: b.status as "confirmed" | "cancelled",
          created_at: b.created_at,
          event: {
            id: eventMap[b.event_id].id,
            title: eventMap[b.event_id].title,
            datetime: eventMap[b.event_id].datetime,
            location: eventMap[b.event_id].location,
            slug: eventMap[b.event_id].slug,
          },
        }));

      setBookings(items);
    } finally {
      setBookingsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, fetchBookings]);

  if (authLoading) {
    return (
      <div className="flex min-h-dvh flex-col bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAFAFA]">
      <Header />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            マイページ
          </h1>
          <p className="mt-1 text-sm text-[#999999]">
            申し込んだイベントを確認できます
          </p>
        </div>

        {bookingsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
          </div>
        ) : (
          <MyBookingsClient initialBookings={bookings} />
        )}
      </main>

      <footer className="border-t border-[#E5E5E5] py-6 text-center text-xs text-[#999999]">
        <p>© 2026 プチイベント作成くん</p>
      </footer>
    </div>
  );
}
