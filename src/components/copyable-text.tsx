"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyableText({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable: fall back to selection
      const sel = window.getSelection();
      const range = document.createRange();
      const node = document.createTextNode(value);
      const span = document.createElement("span");
      span.appendChild(node);
      document.body.appendChild(span);
      range.selectNode(span);
      sel?.removeAllRanges();
      sel?.addRange(range);
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } finally {
        sel?.removeAllRanges();
        document.body.removeChild(span);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? `${label}をコピー` : "コピー"}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[#1A1A1A] hover:bg-[#F2F2F2] transition-colors"
    >
      <span className="font-medium">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-[#999999]" />
      )}
    </button>
  );
}
