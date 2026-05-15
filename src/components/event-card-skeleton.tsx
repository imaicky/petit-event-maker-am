/**
 * EventCard と同じ形・サイズのスケルトンプレースホルダー。
 * 一覧読み込み中の CLS (Cumulative Layout Shift) を防ぐため、
 * 完成形と寸法を一致させてある。
 */
export function EventCardSkeleton() {
  return (
    <div className="block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E5E5E5]/60 animate-pulse">
      {/* Image area (h-44 と完成形に合わせる) */}
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#F2F2F2] to-[#E5E5E5]">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #1A1A1A 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {/* category placeholder */}
        <div className="absolute left-3 top-3 h-5 w-16 rounded-full bg-white/60" />
        {/* availability placeholder */}
        <div className="absolute right-3 top-3 h-5 w-14 rounded-full bg-white/60" />
      </div>

      {/* Content area */}
      <div className="p-4">
        {/* Title 2行 */}
        <div className="mb-3 space-y-2">
          <div className="h-3.5 w-full rounded-full bg-[#F2F2F2]" />
          <div className="h-3.5 w-3/4 rounded-full bg-[#F2F2F2]" />
        </div>

        {/* Meta 3行 */}
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 shrink-0 rounded bg-[#E5E5E5]" />
            <div className="h-3 w-32 rounded-full bg-[#F2F2F2]" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 shrink-0 rounded bg-[#E5E5E5]" />
            <div className="h-3 w-20 rounded-full bg-[#F2F2F2]" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 shrink-0 rounded bg-[#E5E5E5]" />
            <div className="h-3 w-24 rounded-full bg-[#F2F2F2]" />
          </div>
        </div>

        {/* Capacity line */}
        <div className="mb-3">
          <div className="h-3 w-16 rounded-full bg-[#F2F2F2]" />
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-20 rounded-lg bg-[#F2F2F2]" />
          <div className="h-6 w-16 rounded-lg bg-[#E5E5E5]" />
        </div>
      </div>
    </div>
  );
}

/**
 * 複数枚をグリッドで並べる便利ヘルパー。
 * /explore の loading.tsx などで使う。
 */
export function EventCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
