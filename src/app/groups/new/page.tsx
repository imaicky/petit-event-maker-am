"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewGroupPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [discord, setDiscord] = useState("");
  const [substack, setSubstack] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          cover_url: coverUrl.trim() || null,
          discord_url: discord.trim() || null,
          substack_url: substack.trim() || null,
          is_published: true,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "作成に失敗しました");
        setSubmitting(false);
        return;
      }
      router.push(`/groups/${slug}`);
    } catch {
      setError("ネットワークエラー");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <Header />

      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/groups"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#666666] hover:text-[#1A1A1A]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          グループ一覧に戻る
        </Link>

        <h1 className="mb-1 text-2xl font-bold text-[#1A1A1A]">
          新しいグループを作る
        </h1>
        <p className="mb-6 text-sm text-[#666666]">
          シリーズイベントを開催する場所として、フォロワーが集まるグループを作成します
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
              グループ名 <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: AIプロンプト勉強会"
              required
              maxLength={80}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
              スラッグ（URL用）<span className="text-red-500">*</span>
            </label>
            <Input
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
              }
              placeholder="ai-prompt-study"
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
              required
              maxLength={80}
            />
            <p className="mt-1 text-xs text-[#999999]">
              小文字英数字とハイフンのみ。URL: /groups/{slug || "..."}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
              タグライン（短い説明）
            </label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="例: 月1回、実務で使えるプロンプトを共有する会"
              maxLength={140}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
              説明
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="グループの目的・対象・開催頻度などを書いてください"
              rows={5}
              maxLength={2000}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
              カバー画像 URL（任意）
            </label>
            <Input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                Discord 招待URL
              </label>
              <Input
                type="url"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="https://discord.gg/..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1A1A1A]">
                Substack URL
              </label>
              <Input
                type="url"
                value={substack}
                onChange={(e) => setSubstack(e.target.value)}
                placeholder="https://...substack.com"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/groups"
              className="inline-flex items-center rounded-full border border-[#E5E5E5] px-5 py-2 text-sm font-medium text-[#666666] hover:bg-[#FAFAFA]"
            >
              キャンセル
            </Link>
            <Button
              type="submit"
              disabled={submitting || !name.trim() || !slug.trim()}
              className="rounded-full bg-[#1A1A1A] px-5 py-2 text-sm font-medium text-white hover:bg-[#404040] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  作成中…
                </>
              ) : (
                "グループを作成"
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
