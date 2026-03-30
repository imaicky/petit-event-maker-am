"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LineNotifyDialog } from "@/components/line-notify-dialog";

type LineSchedulePromptProps = {
  eventId: string;
  eventTitle: string;
};

export function LineSchedulePrompt({
  eventId,
  eventTitle,
}: LineSchedulePromptProps) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("showLineSchedule") === "true") {
      // Small delay to let the page render first
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <LineNotifyDialog
      open={open}
      onOpenChange={setOpen}
      eventId={eventId}
      eventTitle={eventTitle}
      onSuccess={() => {}}
    />
  );
}
