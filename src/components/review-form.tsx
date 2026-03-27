"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface ReviewFormProps {
  eventId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ eventId, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRating = hovered || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("星をタップして評価を選択してください");
      return;
    }
    if (!name.trim()) {
      setError("お名前を入力してください");
      return;
    }
    if (!comment.trim()) {
      setError("コメントを入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewer_name: name, comment }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "送信に失敗しました");
        return;
      }

      onSuccess?.();
    } catch {
      setError("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Star selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#1A1A1A]">
          評価 <span className="text-[#1A1A1A]">*</span>
        </label>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="星で評価してください"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star}点`}
              className={`text-3xl leading-none transition-transform hover:scale-110 focus:outline-none ${
                star <= displayRating
                  ? "text-[#1A1A1A]"
                  : "text-[#E5E5E5]"
              }`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
            >
              ★
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-[#999999]">
              {["", "残念でした", "もう一息", "良かったです", "とても良かった", "最高でした！"][rating]}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="reviewer-name"
          className="text-sm font-medium text-[#1A1A1A]"
        >
          お名前 <span className="text-[#1A1A1A]">*</span>
        </label>
        <Input
          id="reviewer-name"
          placeholder="例：田中 花子"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
        />
      </div>

      {/* Comment */}
      <div className="space-y-1.5">
        <label
          htmlFor="review-comment"
          className="text-sm font-medium text-[#1A1A1A]"
        >
          コメント <span className="text-[#1A1A1A]">*</span>
        </label>
        <textarea
          id="review-comment"
          placeholder="参加してみての感想をお聞かせください"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-xl border border-[#E5E5E5] bg-transparent px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#999999] outline-none focus-visible:border-[#1A1A1A] focus-visible:ring-2 focus-visible:ring-[#1A1A1A]/20 resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-11 rounded-xl border-[#E5E5E5] text-[#999999] hover:text-[#1A1A1A]"
            onClick={onCancel}
          >
            キャンセル
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-11 rounded-xl bg-[#1A1A1A] font-bold text-white hover:bg-[#111111] disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              送信中...
            </>
          ) : (
            "レビューを送る"
          )}
        </Button>
      </div>
    </form>
  );
}
