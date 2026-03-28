"use client";

import { useState } from "react";
import { Download, Loader2, Instagram } from "lucide-react";

interface StoriesDownloadButtonProps {
  eventId: string;
  eventTitle: string;
}

export function StoriesDownloadButton({
  eventId,
  eventTitle,
}: StoriesDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/stories-image`);
      if (!res.ok) throw new Error("Failed to generate image");

      const blob = await res.blob();
      const file = new File([blob], `event-story-${eventId}.png`, {
        type: "image/png",
      });

      // Try native share with file (mobile Instagram support)
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: eventTitle,
            files: [file],
          });
          return;
        } catch {
          // User cancelled, fall through to download
        }
      }

      // Fallback: download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-story-${eventId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="group flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#1A1A1A] shadow-sm transition-all hover:border-[#1A1A1A]/30 hover:bg-[#F7F7F7] disabled:opacity-50 active:scale-95"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Instagram className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">ストーリーズ用画像</span>
      <span className="sm:hidden">ストーリーズ</span>
      <Download className="h-3.5 w-3.5 text-[#999999] group-hover:text-[#1A1A1A] transition-colors" />
    </button>
  );
}
