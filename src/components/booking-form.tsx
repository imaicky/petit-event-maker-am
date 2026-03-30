"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User, Mail, Phone, CheckCircle2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const bookingSchema = z.object({
  guest_name: z
    .string()
    .min(1, "お名前を入力してください")
    .max(50, "お名前は50文字以内で入力してください"),
  guest_email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  guest_phone: z
    .string()
    .regex(
      /^[\d\-\(\)\+\s]{10,15}$/,
      "有効な電話番号を入力してください（例：090-1234-5678）"
    )
    .optional()
    .or(z.literal("")),
  passcode: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  eventId: string;
  eventTitle: string;
  price: number;
  priceNote?: string;
  remainingSpots: number;
  isLimited?: boolean;
  className?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-[#DC2626]">
      <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-[#DC2626] text-center text-[8px] leading-3">!</span>
      {message}
    </p>
  );
}

export function BookingForm({
  eventId,
  eventTitle,
  price,
  priceNote,
  remainingSpots,
  isLimited,
  className,
}: BookingFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
  });

  const onSubmit = async (data: BookingFormValues) => {
    setServerError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error ?? "申し込みに失敗しました");
        return;
      }

      // Redirect to thanks page with booking details
      if (json.redirect) {
        router.push(json.redirect);
      } else {
        router.push(
          `/events/${eventId}/thanks?name=${encodeURIComponent(data.guest_name)}&email=${encodeURIComponent(data.guest_email)}`
        );
      }
    } catch {
      setServerError("ネットワークエラーが発生しました。もう一度お試しください。");
    }
  };

  const isFull = remainingSpots <= 0;
  const isLow = remainingSpots > 0 && remainingSpots <= 3;

  const inputBase =
    "h-11 rounded-xl border-[#E5E5E5] bg-white pl-10 transition-colors focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("space-y-5", className)}
      noValidate
    >
      {/* Event summary */}
      <div className="rounded-xl bg-gradient-to-r from-[#F7F7F7] to-[#F2F2F2] px-4 py-3.5">
        <p className="text-xs text-[#999999]">申し込みイベント</p>
        <p className="mt-0.5 font-medium leading-snug text-[#1A1A1A] line-clamp-1">
          {eventTitle}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-lg font-bold text-[#1A1A1A]">
            {price === 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#404040]" />
                <span className="text-[#404040]">無料</span>
              </span>
            ) : (
              `¥${price.toLocaleString("ja-JP")}`
            )}
          </p>
          {priceNote && (
            <p className="text-xs text-[#999999] mt-1">{priceNote}</p>
          )}
          {isLow && (
            <span className="flex items-center gap-1 text-xs font-medium text-[#1A1A1A]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1A1A1A] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1A1A1A]" />
              </span>
              あと{remainingSpots}名
            </span>
          )}
        </div>
      </div>

      {/* Name field */}
      <div className="space-y-1">
        <Label htmlFor="guest_name" className="text-sm font-medium text-[#1A1A1A]">
          お名前 <span className="text-[#1A1A1A]">*</span>
        </Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
          <Input
            id="guest_name"
            type="text"
            placeholder="山田 花子"
            autoComplete="name"
            aria-invalid={!!errors.guest_name}
            {...register("guest_name")}
            className={cn(
              inputBase,
              errors.guest_name && "border-[#DC2626] focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/20"
            )}
          />
        </div>
        <FieldError message={errors.guest_name?.message} />
      </div>

      {/* Email field */}
      <div className="space-y-1">
        <Label htmlFor="guest_email" className="text-sm font-medium text-[#1A1A1A]">
          メールアドレス <span className="text-[#1A1A1A]">*</span>
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
          <Input
            id="guest_email"
            type="email"
            placeholder="hanako@example.com"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!errors.guest_email}
            {...register("guest_email")}
            className={cn(
              inputBase,
              errors.guest_email && "border-[#DC2626] focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/20"
            )}
          />
        </div>
        <FieldError message={errors.guest_email?.message} />
      </div>

      {/* Phone field */}
      <div className="space-y-1">
        <Label htmlFor="guest_phone" className="text-sm font-medium text-[#1A1A1A]">
          電話番号{" "}
          <span className="text-xs font-normal text-[#999999]">（任意）</span>
        </Label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
          <Input
            id="guest_phone"
            type="tel"
            placeholder="090-1234-5678"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={!!errors.guest_phone}
            {...register("guest_phone")}
            className={cn(
              inputBase,
              errors.guest_phone && "border-[#DC2626] focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/20"
            )}
          />
        </div>
        <FieldError message={errors.guest_phone?.message} />
      </div>

      {/* Passcode field for limited events */}
      {isLimited && (
        <div className="space-y-1">
          <Label htmlFor="passcode" className="text-sm font-medium text-[#1A1A1A]">
            合言葉 <span className="text-[#1A1A1A]">*</span>
          </Label>
          <p className="text-xs text-[#999999]">主催者から共有された合言葉を入力してください</p>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
            <Input
              id="passcode"
              type="text"
              placeholder="合言葉を入力"
              aria-invalid={!!errors.passcode}
              {...register("passcode")}
              className={cn(
                inputBase,
                errors.passcode && "border-[#DC2626] focus-visible:border-[#DC2626] focus-visible:ring-[#DC2626]/20"
              )}
            />
          </div>
          <FieldError message={errors.passcode?.message} />
        </div>
      )}

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-3 rounded-xl bg-[#DC2626]/8 border border-[#DC2626]/20 px-4 py-3">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#DC2626] text-[8px] font-bold text-[#DC2626]">!</span>
          <p className="text-sm text-[#DC2626]">{serverError}</p>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isSubmitting || isFull}
        className="relative h-12 w-full overflow-hidden rounded-xl bg-[#1A1A1A] text-base font-bold text-white transition-colors hover:bg-[#111111] disabled:opacity-60"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>送信中...</span>
          </span>
        ) : isFull ? (
          "満員です"
        ) : (
          "参加を申し込む"
        )}
      </Button>

      <p className="text-center text-xs text-[#999999]">
        送信後、ご確認メールをお送りします
      </p>
    </form>
  );
}
