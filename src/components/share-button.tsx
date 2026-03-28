"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, X } from "lucide-react";

interface ShareButtonProps {
  url: string;
  title: string;
  /** Visual variant */
  variant?: "overlay" | "inline";
}

export function ShareButton({ url, title, variant = "overlay" }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const shareText = `${title}\n${url}`;

  async function handleShare() {
    // Mobile: use Web Share API if available
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled or API not available, fall through to popover
      }
    }
    // Desktop: toggle popover
    setOpen((prev) => !prev);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(shareText)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  if (variant === "overlay") {
    return (
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={handleShare}
          aria-label="シェアする"
          className="glass flex h-10 w-10 items-center justify-center rounded-full border border-white/20 shadow-lg transition-all duration-200 hover:scale-110 hover:bg-white/40 active:scale-95"
        >
          <Share2 className="h-4 w-4 text-white drop-shadow-sm" />
        </button>

        {open && (
          <div className="absolute right-0 top-12 z-50 w-48 animate-fade-in rounded-xl border border-[#E5E5E5] bg-white p-2 shadow-xl">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-[#999999]">シェアする</span>
              <button type="button" onClick={() => setOpen(false)} className="text-[#999999] hover:text-[#1A1A1A]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <a
              href={lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-[#1A1A1A] hover:bg-[#06C755]/5 transition-colors"
              onClick={() => setOpen(false)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C755] text-white text-base">
                💬
              </span>
              LINE
            </a>
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-[#1A1A1A] hover:bg-[#1DA1F2]/5 transition-colors"
              onClick={() => setOpen(false)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A] text-white text-base">
                𝕏
              </span>
              Twitter / X
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F2F2F2] text-[#1A1A1A]">
                {copied ? <Check className="h-4 w-4 text-[#404040]" /> : <Copy className="h-4 w-4" />}
              </span>
              {copied ? "コピーしました!" : "URLをコピー"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // inline variant
  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={handleShare}
        aria-label="シェアする"
        className="flex h-9 items-center gap-1.5 rounded-full border border-[#E5E5E5] bg-white px-3 text-sm font-medium text-[#1A1A1A] shadow-sm transition-all hover:border-[#1A1A1A]/30 hover:bg-[#F7F7F7] active:scale-95"
      >
        <Share2 className="h-3.5 w-3.5" />
        シェア
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-48 animate-fade-in rounded-xl border border-[#E5E5E5] bg-white p-2 shadow-xl">
          <a
            href={lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-[#1A1A1A] hover:bg-[#06C755]/5 transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C755] text-white text-base">
              💬
            </span>
            LINE
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-[#1A1A1A] hover:bg-[#1DA1F2]/5 transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A1A1A] text-white text-base">
              𝕏
            </span>
            Twitter / X
          </a>
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F2F2F2] text-[#1A1A1A]">
              {copied ? <Check className="h-4 w-4 text-[#404040]" /> : <Copy className="h-4 w-4" />}
            </span>
            {copied ? "コピーしました!" : "URLをコピー"}
          </button>
        </div>
      )}
    </div>
  );
}
