"use client";

import { useEffect, useState } from "react";
import { Pencil, Users, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";

interface EventAdminBarProps {
  eventId: string;
  bookingCount: number;
}

const SUPER_ADMIN_EMAILS = ["imatoru@gmail.com"];

export function EventAdminBar({ eventId, bookingCount }: EventAdminBarProps) {
  const { user, isLoading } = useAuth();
  const [canManage, setCanManage] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading || !user) {
      setChecked(true);
      return;
    }

    async function check() {
      const supabase = createClient();

      // Check super-admin
      if (SUPER_ADMIN_EMAILS.includes(user!.email ?? "")) {
        setCanManage(true);
        setChecked(true);
        return;
      }

      // Check creator
      const { data: event } = await supabase
        .from("events")
        .select("creator_id")
        .eq("id", eventId)
        .single();

      if (event?.creator_id === user!.id) {
        setCanManage(true);
        setChecked(true);
        return;
      }

      // Check co-admin
      const { data: admin } = await supabase
        .from("event_admins")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (admin) {
        setCanManage(true);
      }
      setChecked(true);
    }

    check();
  }, [user, isLoading, eventId]);

  if (!checked || !canManage) return null;

  return (
    <>
      {/* Desktop: sticky bar below breadcrumb */}
      <div className="hidden lg:block sticky top-[49px] z-[19] border-b border-[#E5E5E5]/60 bg-[#1A1A1A]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 text-white/60" />
            <span className="text-xs font-medium text-white/60">
              管理者メニュー
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/events/${eventId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition-colors"
            >
              <Pencil className="h-3 w-3" />
              編集
            </a>
            <a
              href={`/events/${eventId}/attendees`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition-colors"
            >
              <Users className="h-3 w-3" />
              参加者
              {bookingCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/30 px-1 text-[10px] font-bold tabular-nums">
                  {bookingCount}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>

      {/* Mobile: floating bar above the booking CTA */}
      <div className="fixed bottom-[68px] left-0 right-0 z-[29] px-4 pb-2 lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-[#1A1A1A]/90 backdrop-blur-sm px-4 py-2.5 shadow-lg">
          <a
            href={`/events/${eventId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/25 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            編集
          </a>
          <a
            href={`/events/${eventId}/attendees`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white hover:bg-white/25 transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            参加者
            {bookingCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/30 px-1 text-[10px] font-bold tabular-nums">
                {bookingCount}
              </span>
            )}
          </a>
        </div>
      </div>
    </>
  );
}
