import Link from "next/link";
import { JapaneseYen, ArrowRight, Tag } from "lucide-react";
import type { Menu } from "@/types/database";

type MenuWithBookings = Menu & { booking_count: number };

export function MenuCard({ menu }: { menu: MenuWithBookings }) {
  const spotsLeft = menu.capacity ? menu.capacity - menu.booking_count : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const isLow = !isFull && spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 3;

  return (
    <Link href={`/menus/${menu.id}`} className="block group">
      <div className="rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden hover:shadow-lg hover:border-[#1A1A1A]/30 transition-all duration-200">
        {/* Image / placeholder */}
        <div className="h-40 flex items-center justify-center bg-gradient-to-br from-[#F2F2F2] to-[#E0E0E0] relative overflow-hidden">
          {menu.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={menu.image_url}
              alt={menu.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-5xl opacity-70">📋</span>
          )}
          {/* Price badge */}
          <div className="absolute top-3 right-3">
            <span className="inline-block rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-[#1A1A1A] shadow-sm">
              {menu.price === 0
                ? "無料"
                : `¥${menu.price.toLocaleString("ja-JP")}`}
            </span>
          </div>
          {/* Availability badge */}
          {spotsLeft !== null && (
            <div className="absolute bottom-3 left-3">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
                  isFull
                    ? "bg-[#E5E5E5]/90 text-[#999999]"
                    : isLow
                    ? "bg-[#FF8C00]/90 text-white"
                    : "bg-[#404040]/90 text-white"
                }`}
              >
                {isFull ? "満員" : isLow ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" /></span>
                    残りわずか
                  </>
                ) : "受付中"}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          {menu.category && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F2] px-2 py-0.5 text-[10px] font-medium text-[#666666]">
              <Tag className="h-2.5 w-2.5" />
              {menu.category}
            </span>
          )}

          <h3
            className="font-bold text-[#1A1A1A] leading-snug line-clamp-2 group-hover:text-[#1A1A1A] transition-colors"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            {menu.title}
          </h3>

          {menu.description && (
            <p className="text-xs text-[#999999] line-clamp-2 leading-relaxed">
              {menu.description}
            </p>
          )}

          <div className="flex items-center justify-end pt-1">
            <span className="flex items-center gap-0.5 text-xs font-medium text-[#1A1A1A] group-hover:gap-1 transition-all">
              詳細を見る
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
