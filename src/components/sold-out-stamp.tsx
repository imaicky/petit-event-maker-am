// "満員御礼" stamp overlay shown on top of the event hero image when an event
// is fully booked. Pure presentational — caller decides when to render it.

interface SoldOutStampProps {
  /** Tailwind size class for width. Defaults to a hero-image-friendly size. */
  size?: "sm" | "md" | "lg";
  /** Optional rotation override (degrees). Defaults to a slight tilt. */
  rotateDeg?: number;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<SoldOutStampProps["size"]>, string> = {
  sm: "w-20 sm:w-24",
  md: "w-32 sm:w-40 md:w-48",
  lg: "w-44 sm:w-56 md:w-72",
};

export function SoldOutStamp({ size = "md", rotateDeg = -8, className = "" }: SoldOutStampProps) {
  return (
    <div
      role="img"
      aria-label="満員御礼"
      className={`pointer-events-none select-none ${SIZE_CLASSES[size]} ${className}`}
      style={{
        transform: `rotate(${rotateDeg}deg)`,
        filter: "drop-shadow(0 4px 8px rgba(180, 30, 30, 0.25))",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/stamps/manin-onrei.png"
        alt="満員御礼"
        className="h-auto w-full"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
