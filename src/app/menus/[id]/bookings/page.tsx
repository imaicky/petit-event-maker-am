"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Loader2,
  Mail,
  Phone,
  Clock,
  UserX,
  Tag,
  JapaneseYen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Database, CustomField } from "@/types/database";

// --- Types -------------------------------------------------------------------

type Menu = Database["public"]["Tables"]["menus"]["Row"];
type MenuBooking = Database["public"]["Tables"]["menu_bookings"]["Row"];

// --- Helpers -----------------------------------------------------------------

function formatBookingDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatCustomValue(value: string, type: string): string {
  if (!value) return "--";
  if (type === "date") {
    try {
      return new Date(value).toLocaleDateString("ja-JP");
    } catch {
      return value;
    }
  }
  return value;
}

// --- Loading skeleton --------------------------------------------------------

function LoadingSkeleton() {
  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-xl bg-[#E5E5E5]" />
          <div className="h-6 w-48 animate-pulse rounded-lg bg-[#E5E5E5]" />
        </div>
        <div className="h-32 animate-pulse rounded-2xl bg-[#E5E5E5] mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-[#E5E5E5]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

// --- Page --------------------------------------------------------------------

export default function MenuBookingsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const menuId = params.id;
  const { user, isLoading: authLoading } = useAuth();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [bookings, setBookings] = useState<MenuBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!menuId || !user) return;

    const supabase = createClient();

    try {
      // Fetch menu and verify ownership
      const { data: menuData, error: menuError } = await supabase
        .from("menus")
        .select("*")
        .eq("id", menuId)
        .single();

      if (menuError || !menuData) {
        setError("メニューが見つかりませんでした");
        setLoading(false);
        return;
      }

      if (menuData.creator_id !== user.id) {
        router.replace("/dashboard");
        return;
      }

      setMenu(menuData);

      // Fetch confirmed bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("menu_bookings")
        .select("*")
        .eq("menu_id", menuId)
        .eq("status", "confirmed")
        .order("created_at", { ascending: true });

      if (bookingsError) {
        setError("申込一覧の取得に失敗しました");
        setLoading(false);
        return;
      }

      setBookings(bookingsData ?? []);
    } catch {
      setError("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [menuId, user, router]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/");
      return;
    }

    fetchData();
  }, [authLoading, user, router, fetchData]);

  // --- Loading ---------------------------------------------------------------

  if (authLoading || loading) {
    return <LoadingSkeleton />;
  }

  // --- Error -----------------------------------------------------------------

  if (error || !menu) {
    return (
      <main className="min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-col items-center justify-center px-4 py-20">
          <div className="text-5xl mb-4">:(</div>
          <p className="text-lg font-bold text-[#1A1A1A] mb-2">
            {error ?? "メニューが見つかりませんでした"}
          </p>
          <p className="text-sm text-[#999999] mb-6">
            URLを確認するか、ダッシュボードから操作してください。
          </p>
          <Button
            variant="outline"
            className="rounded-full border-[#E5E5E5] hover:border-[#1A1A1A]/30"
            onClick={() => router.push("/dashboard")}
          >
            ダッシュボードに戻る
          </Button>
        </div>
      </main>
    );
  }

  // --- Render ----------------------------------------------------------------

  const confirmedCount = bookings.length;
  const capacity = menu.capacity;
  const capacityRatio =
    capacity && capacity > 0
      ? Math.min((confirmedCount / capacity) * 100, 100)
      : 0;
  const priceStr = menu.price === 0 ? "無料" : `¥${menu.price.toLocaleString()}`;
  const customFields = (menu.custom_fields ?? []) as unknown as CustomField[];

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Back navigation */}
        <div className="mb-6 flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            aria-label="ダッシュボードに戻る"
            className="h-8 w-8 p-0 rounded-xl text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1
            className="text-lg font-bold text-[#1A1A1A] truncate flex-1"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            申込一覧
          </h1>
        </div>

        {/* Menu summary card */}
        <div className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden mb-6">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {menu.category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F2] px-2 py-0.5 text-xs font-medium text-[#666666]">
                  <Tag className="h-2.5 w-2.5" />
                  {menu.category}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-[#999999]">
                <JapaneseYen className="h-3 w-3" />
                {priceStr}
              </span>
            </div>
            <h2
              className="text-base font-bold text-[#1A1A1A] leading-snug"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              {menu.title}
            </h2>
          </div>

          {/* Booking count bar */}
          <div className="border-t border-[#F2F2F2] px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-[#1A1A1A]">
                <Users className="h-4 w-4 text-[#1A1A1A]" />
                予約状況
              </span>
              <span className="text-sm font-bold tabular-nums">
                <span className="text-[#1A1A1A]">{confirmedCount}</span>
                {capacity != null && (
                  <span className="text-[#999999]"> / {capacity}名</span>
                )}
              </span>
            </div>
            {capacity != null && capacity > 0 && (
              <div className="h-2 w-full rounded-full bg-[#F2F2F2] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${capacityRatio}%`,
                    backgroundColor:
                      capacityRatio >= 100 ? "#EF4444" : "#404040",
                  }}
                />
              </div>
            )}
            {capacity != null && confirmedCount >= capacity && (
              <p className="mt-1.5 text-xs font-medium text-[#EF4444]">
                満員です
              </p>
            )}
          </div>
        </div>

        {/* Bookings list */}
        {bookings.length === 0 ? (
          <div className="rounded-2xl bg-white border border-[#E5E5E5] p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F2F2F2]">
              <UserX className="h-6 w-6 text-[#999999]" />
            </div>
            <p
              className="text-base font-bold text-[#1A1A1A] mb-1"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              まだ申し込みがありません
            </p>
            <p className="text-sm text-[#999999] leading-relaxed">
              メニューページを共有して、申込みを受け付けましょう。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Attendee rows */}
            {bookings.map((booking, index) => {
              const cfValues = (booking.custom_field_values ?? {}) as Record<string, string>;

              return (
                <div
                  key={booking.id}
                  className="rounded-2xl bg-white border border-[#E5E5E5] px-5 py-4 transition-colors hover:border-[#1A1A1A]/20"
                >
                  {/* Mobile layout */}
                  <div className="sm:hidden space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#1A1A1A] shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          {booking.guest_name}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-[#999999]">
                        <Clock className="h-3 w-3" />
                        {formatBookingDate(booking.created_at)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 pl-[42px]">
                      <span className="flex items-center gap-1.5 text-xs text-[#999999]">
                        <Mail className="h-3 w-3" />
                        {booking.guest_email}
                      </span>
                      {booking.guest_phone && (
                        <span className="flex items-center gap-1.5 text-xs text-[#999999]">
                          <Phone className="h-3 w-3" />
                          {booking.guest_phone}
                        </span>
                      )}
                    </div>
                    {/* Custom fields (mobile) */}
                    {customFields.length > 0 && (
                      <div className="pl-[42px] pt-1 border-t border-[#F2F2F2] space-y-1">
                        {customFields.map((field) => (
                          <div key={field.id} className="flex items-start gap-2 text-xs">
                            <span className="text-[#999999] shrink-0">{field.label}:</span>
                            <span className="text-[#1A1A1A]">
                              {formatCustomValue(cfValues[field.id] ?? "", field.type)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Desktop layout */}
                  <div className="hidden sm:block">
                    <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-center">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F2F2F2] text-xs font-bold text-[#1A1A1A] shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-[#1A1A1A] truncate">
                          {booking.guest_name}
                        </span>
                      </div>
                      <span className="flex items-center gap-1.5 text-sm text-[#999999] min-w-0 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {booking.guest_email}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-[#999999] w-32">
                        {booking.guest_phone ? (
                          <>
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {booking.guest_phone}
                          </>
                        ) : (
                          <span className="text-[#E5E5E5]">--</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-[#999999] w-28 justify-end">
                        <Clock className="h-3 w-3" />
                        {formatBookingDate(booking.created_at)}
                      </span>
                    </div>
                    {/* Custom fields (desktop) */}
                    {customFields.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#F2F2F2] flex flex-wrap gap-x-6 gap-y-1.5 pl-[38px]">
                        {customFields.map((field) => (
                          <div key={field.id} className="flex items-center gap-1.5 text-xs">
                            <span className="text-[#999999]">{field.label}:</span>
                            <span className="text-[#1A1A1A] font-medium">
                              {formatCustomValue(cfValues[field.id] ?? "", field.type)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Summary footer */}
            <div className="pt-2 px-5 text-right">
              <span className="text-xs text-[#999999]">
                {confirmedCount}件の申込
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
