import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface ShortUrlPageProps {
  params: Promise<{ code: string }>;
}

export default async function ShortUrlPage({ params }: ShortUrlPageProps) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("short_code", code)
    .single();

  if (!event) {
    notFound();
  }

  redirect(`/events/${event.id}`);
}
