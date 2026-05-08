import { createAdminClient } from "@/lib/supabase/admin";
import { getAudienceInsights } from "@/lib/user-history";
import {
  generateSyllabusWithClaude,
  type AudienceInput,
  type AiSyllabusSuggestion,
} from "@/lib/claude";

type AdminFromAny = (table: string) => ReturnType<
  ReturnType<typeof createAdminClient>["from"]
>;

function fromTable(name: string) {
  const admin = createAdminClient();
  return (admin.from as unknown as AdminFromAny)(name);
}

export async function buildAudienceInputForEvent(
  eventId: string,
  organizerId: string
): Promise<AudienceInput | null> {
  const audience = await getAudienceInsights(eventId);
  if (audience.participant_count === 0) {
    return null;
  }

  // Event metadata
  const { data: ev } = await fromTable("events")
    .select("title, category, category_id")
    .eq("id", eventId)
    .single();

  const evRow = (ev ?? {}) as {
    title?: string;
    category?: string | null;
    category_id?: number | null;
  };

  // Resolve category name
  let currentCategory: string | null = evRow.category ?? null;
  if (evRow.category_id != null) {
    const { data: catRows } = await fromTable("event_categories")
      .select("id, name")
      .eq("id", evRow.category_id)
      .single();
    const cat = catRows as { name?: string } | null;
    if (cat?.name) currentCategory = cat.name;
  }

  // Organizer past categories
  const { data: ownEvents } = await fromTable("events")
    .select("category, category_id")
    .eq("creator_id", organizerId);

  const pastCategories = new Set<string>();
  const ownCategoryIds = new Set<number>();
  for (const e of (ownEvents ?? []) as Array<{
    category: string | null;
    category_id: number | null;
  }>) {
    if (e.category) pastCategories.add(e.category);
    if (e.category_id != null) ownCategoryIds.add(e.category_id);
  }
  if (ownCategoryIds.size > 0) {
    const { data: catNames } = await fromTable("event_categories")
      .select("id, name")
      .in("id", Array.from(ownCategoryIds));
    for (const c of (catNames ?? []) as Array<{
      id: number;
      name: string;
    }>) {
      pastCategories.add(c.name);
    }
  }

  return {
    participantCount: audience.participant_count,
    topCategories: audience.audience_categories.slice(0, 8),
    aiLevelDistribution: audience.audience_ai_level_distribution,
    organizerPastCategories: Array.from(pastCategories),
    currentEventTitle: evRow.title ?? "（タイトル不明）",
    currentEventCategory: currentCategory,
  };
}

export async function suggestSyllabusWithAi(
  eventId: string,
  organizerId: string
): Promise<AiSyllabusSuggestion[]> {
  const input = await buildAudienceInputForEvent(eventId, organizerId);
  if (!input) return [];
  return generateSyllabusWithClaude(input);
}
