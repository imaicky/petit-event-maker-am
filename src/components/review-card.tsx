export interface Review {
  id: string;
  event_id: string;
  reviewer_name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  created_at: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating}点`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 transition-colors ${
            star <= rating ? "text-[#1A1A1A]" : "text-[#E5E5E5]"
          }`}
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "今日";
    if (diffDays === 1) return "1日前";
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 14) return "1週間前";
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
    if (diffDays < 60) return "1ヶ月前";
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts[0].charAt(0) + parts[1].charAt(0);
  }
  return name.slice(0, 2);
}

// Deterministic color from name
function getAvatarColor(name: string): { bg: string; text: string } {
  const colors = [
    { bg: "#F7F7F7", text: "#1A1A1A" },
    { bg: "#EEFAF4", text: "#404040" },
    { bg: "#F0F4FF", text: "#6B7FBF" },
    { bg: "#FFF9EC", text: "#C9922A" },
    { bg: "#FFF0F5", text: "#C96A8A" },
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

interface ReviewCardProps {
  review: Review;
  className?: string;
}

export function ReviewCard({ review, className }: ReviewCardProps) {
  const initials = getInitials(review.reviewer_name);
  const { bg, text } = getAvatarColor(review.reviewer_name);
  const relativeDate = formatRelativeDate(review.created_at);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E5E5E5] ${className ?? ""}`}
    >
      {/* Decorative quote mark */}
      <div className="absolute right-4 top-3 select-none text-5xl font-serif leading-none text-[#F2F2F2]" aria-hidden="true">
        &ldquo;
      </div>

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar with initials */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{ backgroundColor: bg, color: text }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {review.reviewer_name}
            </p>
            <p className="text-xs text-[#999999]" title={new Date(review.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}>
              {relativeDate}
            </p>
          </div>
        </div>

        {/* Stars */}
        <StarRating rating={review.rating} />
      </div>

      {/* Comment */}
      <p className="text-sm leading-relaxed text-[#555555]">
        {review.comment}
      </p>
    </div>
  );
}
