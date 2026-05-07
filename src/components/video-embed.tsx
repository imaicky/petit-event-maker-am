// Lightweight YouTube embed.
// The URL is read from a public env var so non-developers can swap the video
// just by updating Vercel env settings.

const VIDEO_URL = process.env.NEXT_PUBLIC_LINE_GUIDE_VIDEO_URL || "";

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoEmbed({
  title = "ガイド動画",
  className,
}: {
  title?: string;
  className?: string;
}) {
  if (!VIDEO_URL) return null;
  const embed = getYouTubeEmbedUrl(VIDEO_URL);
  if (!embed) return null;
  return (
    <div
      className={
        className ??
        "rounded-2xl overflow-hidden border border-[#E5E5E5] bg-black aspect-video"
      }
    >
      <iframe
        src={embed}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}
