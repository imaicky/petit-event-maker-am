import { Header } from "@/components/header";
import { EventCardSkeletonGrid } from "@/components/event-card-skeleton";

/**
 * /explore のロード中表示。
 * Next.js 16 の React Server Component が解決される前にこの UI が出る。
 */
export default function ExploreLoading() {
  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />
      <div className="border-b border-[#E5E5E5]/60 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
          <div className="mb-6 h-8 w-72 rounded-lg bg-[#F2F2F2]" />
          <div className="mb-4 h-11 w-full rounded-xl bg-[#F2F2F2]" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-full bg-[#F2F2F2]" />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <EventCardSkeletonGrid count={9} />
      </div>
    </main>
  );
}
