"use client";

import { useState } from "react";
import { Loader2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BookingCancelDialogProps {
  eventId: string;
  booking: {
    id: string;
    guest_name: string;
  };
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

export function BookingCancelDialog({
  eventId,
  booking,
  open,
  onClose,
  onCancelled,
}: BookingCancelDialogProps) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setCancelling(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "キャンセルに失敗しました");
        return;
      }

      onCancelled();
      onClose();
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50">
              <UserX className="h-4 w-4 text-red-500" />
            </div>
            予約をキャンセルしますか？
          </DialogTitle>
          <DialogDescription>
            <strong>{booking.guest_name}</strong> さんの予約をキャンセルします。
            キャンセル通知メールが送信されます。
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-xs text-red-500 px-1">{error}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={cancelling}
            className="rounded-xl"
          >
            戻る
          </Button>
          <Button
            onClick={handleCancel}
            disabled={cancelling}
            className="rounded-xl bg-red-500 text-white hover:bg-red-600 gap-2"
          >
            {cancelling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                キャンセル中...
              </>
            ) : (
              <>
                <UserX className="h-4 w-4" />
                キャンセルする
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
