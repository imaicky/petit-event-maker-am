"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReviewForm } from "@/components/review-form";
import { MessageSquarePlus, CheckCircle2 } from "lucide-react";

interface ReviewSectionProps {
  eventId: string;
}

export function ReviewSection({ eventId }: ReviewSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (isDone) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#F5F5F5] p-5 ring-1 ring-[#404040]/20">
        <CheckCircle2 className="h-6 w-6 shrink-0 text-[#404040]" />
        <div>
          <p className="text-sm font-medium text-[#1A1A1A]">
            レビューを送信しました！
          </p>
          <p className="text-xs text-[#999999]">
            ご感想をお寄せいただきありがとうございます。
          </p>
        </div>
      </div>
    );
  }

  if (isOpen) {
    return (
      <div className="rounded-2xl bg-white p-5 ring-1 ring-[#E5E5E5]">
        <h3 className="mb-4 text-sm font-bold text-[#1A1A1A]">
          レビューを書く
        </h3>
        <ReviewForm
          eventId={eventId}
          onSuccess={() => {
            setIsOpen(false);
            setIsDone(true);
          }}
          onCancel={() => setIsOpen(false)}
        />
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full rounded-xl border-[#1A1A1A]/40 text-[#1A1A1A] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] gap-2"
      onClick={() => setIsOpen(true)}
    >
      <MessageSquarePlus className="h-4 w-4" />
      レビューを書く
    </Button>
  );
}
