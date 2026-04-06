"use client";

import { useState, useRef, useCallback } from "react";
import { ImageIcon, Loader2, X, Upload, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useUrl, setUseUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error ?? "アップロードに失敗しました");
          return;
        }

        onChange(json.url);
      } catch {
        setError("ネットワークエラーが発生しました");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleRemove = () => {
    onChange("");
    setError(null);
  };

  // Show preview when we have a value
  if (value && !useUrl) {
    return (
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-[#E5E5E5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="アップロード済み"
            className="w-full object-contain"
            style={{ maxHeight: "320px", minHeight: "80px" }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="画像を削除"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setUseUrl(true)}
          className="text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
        >
          URL入力に切替
        </button>
      </div>
    );
  }

  if (useUrl) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]" />
          <Input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 rounded-xl border-[#E5E5E5] pl-9 transition-colors focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
          />
        </div>
        <button
          type="button"
          onClick={() => setUseUrl(false)}
          className="text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
        >
          ファイルアップロードに切替
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!uploading) inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 transition-colors ${
          dragOver
            ? "border-[#1A1A1A] bg-[#F2F2F2]"
            : "border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#1A1A1A]/40 hover:bg-[#F7F7F7]"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-[#999999]" />
            <p className="text-sm text-[#999999]">アップロード中...</p>
          </>
        ) : (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2F2F2]">
              <Upload className="h-5 w-5 text-[#999999]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#1A1A1A]">
                クリックまたはドラッグ&ドロップ
              </p>
              <p className="mt-1 text-xs text-[#999999]">
                JPEG, PNG, WebP, GIF（5MB以下）
              </p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
          aria-label="画像ファイルを選択"
        />
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-[#DC2626]">
          <ImageIcon className="h-3 w-3" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setUseUrl(true)}
        className="text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
      >
        URL入力に切替
      </button>
    </div>
  );
}
