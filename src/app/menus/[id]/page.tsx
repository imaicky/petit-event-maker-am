import { notFound } from "next/navigation";
import Link from "next/link";
import { JapaneseYen, Users, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MenuBookingForm } from "@/components/menu-booking-form";
import type { CustomField } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: menu, error } = await supabase
    .from("menus")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !menu) {
    notFound();
  }

  if (!menu.is_published) {
    // Check if current user is creator
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== menu.creator_id) {
      notFound();
    }
  }

  // Get booking count
  const { count: bookingCount } = await supabase
    .from("menu_bookings")
    .select("*", { count: "exact", head: true })
    .eq("menu_id", id)
    .eq("status", "confirmed");

  // Get creator profile
  const { data: creator } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", menu.creator_id)
    .single();

  const priceStr = menu.price === 0 ? "無料" : `¥${menu.price.toLocaleString()}`;
  const customFields = (menu.custom_fields ?? []) as unknown as CustomField[];
  const isFull = menu.capacity !== null && (bookingCount ?? 0) >= menu.capacity;

  return (
    <div className="min-h-dvh bg-[#FAFAFA]">
      {/* Hero image */}
      {menu.image_url && (
        <div className="relative h-48 sm:h-64 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={menu.image_url}
            alt={menu.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Category badge */}
        {menu.category && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F2] px-3 py-1 text-xs font-medium text-[#666666] mb-3">
            <Tag className="h-3 w-3" />
            {menu.category}
          </span>
        )}

        {/* Title */}
        <h1
          className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          {menu.title}
        </h1>

        {/* Creator */}
        {creator && (
          <Link
            href={`/${creator.username}`}
            className="inline-flex items-center gap-2 mb-6 group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] text-white text-xs font-bold overflow-hidden">
              {creator.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name ?? creator.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                (creator.display_name ?? creator.username).slice(0, 1)
              )}
            </div>
            <span className="text-sm text-[#666666] group-hover:text-[#1A1A1A] transition-colors">
              {creator.display_name ?? creator.username}
            </span>
          </Link>
        )}

        {/* Info bar */}
        <div className="flex flex-wrap gap-4 mb-6 rounded-2xl border border-[#E5E5E5] bg-white p-4">
          <div className="flex items-center gap-2">
            <JapaneseYen className="h-4 w-4 text-[#1A1A1A]" />
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">{priceStr}</p>
              {menu.price_note && (
                <p className="text-xs text-[#999999]">{menu.price_note}</p>
              )}
            </div>
          </div>
          {menu.capacity !== null && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#1A1A1A]" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {bookingCount ?? 0} / {menu.capacity}名
                </p>
                <p className="text-xs text-[#999999]">
                  {isFull ? "満員" : `残り${menu.capacity - (bookingCount ?? 0)}枠`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {menu.description && (
          <div className="mb-8">
            <h2
              className="text-lg font-bold text-[#1A1A1A] mb-3"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              メニュー詳細
            </h2>
            <div className="prose prose-sm max-w-none text-[#1A1A1A]/80 whitespace-pre-wrap leading-relaxed">
              {menu.description}
            </div>
          </div>
        )}

        {/* Booking form */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6">
          <h2
            className="text-lg font-bold text-[#1A1A1A] mb-4"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            お申し込みフォーム
          </h2>
          {isFull ? (
            <div className="text-center py-8">
              <p className="text-[#999999] text-sm">
                このメニューは現在定員に達しています
              </p>
            </div>
          ) : (
            <MenuBookingForm menuId={id} customFields={customFields} />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E5] bg-white py-6 text-center">
        <Link href="/" className="inline-block">
          <span
            className="text-sm font-bold text-[#1A1A1A] hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            プチイベント作成くん
          </span>
        </Link>
      </footer>
    </div>
  );
}
