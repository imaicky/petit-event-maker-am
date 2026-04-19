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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  passcodeVerified?: boolean;
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
  passcodeVerified,
  className,
}: BookingFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [lineModal, setLineModal] = useState<{
    open: boolean;
    url: string;
    redirect: string;
  }>({ open: false, url: "", redirect: "" });

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

      // If paid event, redirect to Stripe Checkout
      if (json.requires_payment && json.booking_id) {
        try {
          const stripeRes = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              booking_id: json.booking_id,
              event_id: eventId,
            }),
          });
          const stripeJson = await stripeRes.json();
          if (stripeRes.ok && stripeJson.url) {
            window.location.href = stripeJson.url;
            return;
          }
          // Stripe checkout failed — cancel the pending booking to clean up
          try {
            await fetch(`/api/events/${eventId}/cancel`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ booking_id: json.booking_id }),
            });
          } catch {
            // Cleanup failed — ignore, booking will remain pending
          }
          setServerError("決済ページの作成に失敗しました。主催者にお問い合わせください。");
          return;
        } catch {
          // Network error — try to cancel the pending booking
          try {
            await fetch(`/api/events/${eventId}/cancel`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ booking_id: json.booking_id }),
            });
          } catch {
            // Cleanup failed — ignore
          }
          setServerError("決済ページへの接続に失敗しました。");
          return;
        }
      }

      const redirectUrl =
        json.redirect ??
        `/events/${eventId}/thanks?name=${encodeURIComponent(data.guest_name)}&email=${encodeURIComponent(data.guest_email)}`;

      // Show LINE friend modal if URL is available, otherwise redirect immediately
      if (json.line_friend_url) {
        setLineModal({
          open: true,
          url: json.line_friend_url,
          redirect: redirectUrl,
        });
      } else {
        router.push(redirectUrl);
      }
    } catch {
      setServerError("ネットワークエラーが発生しました。もう一度お試しください。");
    }
  };

  const isFull = remainingSpots <= 0;
  const isLow = !isFull && remainingSpots > 0 && remainingSpots <= 3;

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
          {isFull ? (
            <span className="text-xs font-medium text-[#FF8C00]">
              キャンセル待ち
            </span>
          ) : isLow ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#FF8C00]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF8C00] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF8C00]" />
              </span>
              残りわずか
            </span>
          ) : null}
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

      {/* Passcode field for limited events (hidden when already verified via gate) */}
      {isLimited && !passcodeVerified && (
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

      {/* Stripe info for paid events */}
      {price > 0 && !isFull && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
          <p className="text-xs text-blue-700">
            Stripeの安全な決済画面に移動します。クレジットカードで決済できます。
          </p>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "relative h-14 w-full overflow-hidden rounded-xl text-lg font-bold text-white transition-all duration-200 disabled:opacity-60",
          isFull
            ? "bg-gradient-to-r from-[#FF8C00] to-[#E67700] shadow-lg shadow-[#FF8C00]/30 hover:from-[#E67700] hover:to-[#CC6A00] hover:shadow-xl hover:shadow-[#FF8C00]/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
            : "bg-gradient-to-r from-[#E8590C] to-[#D9480F] shadow-lg shadow-[#E8590C]/30 hover:from-[#D9480F] hover:to-[#C92A2A] hover:shadow-xl hover:shadow-[#E8590C]/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{price > 0 && !isFull ? "決済ページへ移動中..." : "送信中..."}</span>
          </span>
        ) : isFull ? (
          "キャンセル待ちに登録"
        ) : price > 0 ? (
          "決済に進む"
        ) : (
          "参加を申し込む"
        )}
      </Button>

      <p className="text-center text-xs text-[#999999]">
        {isFull
          ? "キャンセルが出た場合、自動的に繰り上がります"
          : price > 0
          ? "決済完了後、ご確認メールをお送りします"
          : "送信後、ご確認メールをお送りします"}
      </p>

      {/* LINE Friend Add Modal */}
      <Dialog
        open={lineModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setLineModal((prev) => ({ ...prev, open: false }));
            router.push(lineModal.redirect);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="text-center px-6 py-8">
          <DialogHeader className="items-center">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#06C755]/10">
              <CheckCircle2 className="h-8 w-8 text-[#06C755]" />
            </div>
            <DialogTitle className="text-xl font-bold text-[#1A1A1A]">
              お申し込み完了！
            </DialogTitle>
            <DialogDescription className="text-sm text-[#666666]">
              LINEで予約確認・リマインドを受け取りませんか？
            </DialogDescription>
          </DialogHeader>

          <ul className="mx-auto mt-2 space-y-1.5 text-left text-sm text-[#666666]">
            <li className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              イベントリマインド通知
            </li>
            <li className="flex items-center gap-2">
              <span className="text-base">📢</span>
              最新イベント情報
            </li>
            <li className="flex items-center gap-2">
              <span className="text-base">📝</span>
              変更・キャンセル通知
            </li>
          </ul>

          <div className="mt-4 space-y-3">
            <a
              href={lineModal.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Navigate to thanks page after opening LINE link
                setTimeout(() => {
                  setLineModal((prev) => ({ ...prev, open: false }));
                  router.push(lineModal.redirect);
                }, 500);
              }}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-[#06C755] text-base font-bold text-white shadow-lg shadow-[#06C755]/30 transition-all hover:bg-[#05b54c] active:scale-95"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE友だち追加
            </a>
            <button
              type="button"
              onClick={() => {
                setLineModal((prev) => ({ ...prev, open: false }));
                router.push(lineModal.redirect);
              }}
              className="w-full text-sm text-[#999999] hover:text-[#666666] transition-colors py-2"
            >
              あとで
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
