import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://petit-event-maker-am.vercel.app";

export const revalidate = 1800; // 30 min

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/explore?view=calendar`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  let dynamicEntries: MetadataRoute.Sitemap = [];

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();

      // Public events
      const { data: events } = await admin
        .from("events")
        .select("id, slug, short_code, updated_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1000);

      const eventEntries = ((events ?? []) as Array<{
        id: string;
        slug: string | null;
        short_code: string | null;
        updated_at: string | null;
      }>).map((e) => ({
        url: e.short_code
          ? `${SITE_URL}/e/${e.short_code}`
          : `${SITE_URL}/events/${e.id}`,
        lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

      // Public profiles
      const { data: profiles } = await admin
        .from("profiles")
        .select("username, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1000);

      const profileEntries = ((profiles ?? []) as Array<{
        username: string | null;
        updated_at: string | null;
      }>)
        .filter((p) => p.username)
        .map((p) => ({
          url: `${SITE_URL}/${p.username}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }));

      dynamicEntries = [...eventEntries, ...profileEntries];
    } catch (e) {
      console.error("[sitemap] dynamic generation failed:", e);
    }
  }

  return [...staticEntries, ...dynamicEntries];
}
