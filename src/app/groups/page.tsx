import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { Header } from "@/components/header";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Group = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  tagline: string | null;
  owner_id: string;
  category_id: number | null;
  created_at: string;
};

async function getPublishedGroups(): Promise<Group[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const admin = createAdminClient();
  const { data } = await (
    admin.from as unknown as (
      t: string
    ) => ReturnType<typeof admin.from>
  )("event_groups")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as Group[];
}

export default async function GroupsIndexPage() {
  const groups = await getPublishedGroups();

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">
              主催者グループ
            </h1>
            <p className="mt-1 text-sm text-[#666666]">
              シリーズイベントを開催する主催者のグループ一覧
            </p>
          </div>
          <Link
            href="/groups/new"
            className="inline-flex items-center gap-1 rounded-full bg-[#1A1A1A] px-5 py-2 text-sm font-medium text-white hover:bg-[#404040] transition-colors"
          >
            <Plus className="h-4 w-4" />
            グループを作る
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white p-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-[#999999]" />
            <p className="mb-2 text-base font-medium text-[#1A1A1A]">
              まだグループがありません
            </p>
            <p className="text-sm text-[#666666]">
              最初のグループを作って、シリーズイベントを開催しましょう
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.slug}`}
                className="group block overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white transition-all hover:border-[#1A1A1A]/30 hover:shadow-md"
              >
                <div className="aspect-[3/2] relative overflow-hidden bg-gradient-to-br from-[#FAFAFA] via-[#F2F2F2] to-[#E5E5E5]">
                  {g.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.cover_url}
                      alt={g.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl">
                      <Users className="h-12 w-12 text-[#999999]" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-base font-bold text-[#1A1A1A] line-clamp-1">
                    {g.name}
                  </h2>
                  {g.tagline && (
                    <p className="mt-1 text-xs text-[#C26A4A] line-clamp-1">
                      {g.tagline}
                    </p>
                  )}
                  {g.description && (
                    <p className="mt-2 text-xs text-[#666666] line-clamp-2 leading-relaxed">
                      {g.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
