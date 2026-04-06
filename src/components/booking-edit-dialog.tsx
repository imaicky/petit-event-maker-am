"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface BookingEditDialogProps {
  eventId: string;
  booking: {
    id: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string | null;
  };
  open: boolean;
  onClose: () => void;
  onSaved: (updated: { guest_name: string; guest_email: string; guest_phone: string | null }) => void;
}

export function BookingEditDialog({
  eventId,
  booking,
  open,
  onClose,
  onSaved,
}: BookingEditDialogProps) {
  const [name, setName] = useState(booking.guest_name);
  const [email, setEmail] = useState(booking.guest_email);
  const [phone, setPhone] = useState(booking.guest_phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      setError("名前とメールアドレスは必須です");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/events/${eventId}/bookings/${booking.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guest_name: name.trim(),
            guest_email: email.trim(),
            guest_phone: phone.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "更新に失敗しました");
        return;
      }

      onSaved({
        guest_name: name.trim(),
        guest_email: email.trim(),
        guest_phone: phone.trim() || null,
      });
      onClose();
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2F2F2]">
              <Pencil className="h-4 w-4 text-[#1A1A1A]" />
            </div>
            予約情報を編集
          </DialogTitle>
          <DialogDescription>
            参加者の名前・メール・電話番号を変更できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">名前 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-xl border-[#E5E5E5] bg-[#FAFAFA]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">メール *</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-xl border-[#E5E5E5] bg-[#FAFAFA]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">
              電話番号 <span className="text-xs text-[#999999]">（任意）</span>
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 rounded-xl border-[#E5E5E5] bg-[#FAFAFA]"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111] gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存する"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
