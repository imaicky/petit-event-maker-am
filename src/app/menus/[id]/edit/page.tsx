"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  JapaneseYen,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";
import { ImageUpload } from "@/components/image-upload";
import { CustomFieldsBuilder } from "@/components/custom-fields-builder";
import type { CustomField } from "@/types/database";

// ─── Schema ──────────────────────────────────────────────────

const menuSchema = z.object({
  title: z
    .string()
    .min(1, "メニュー名を入力してください")
    .max(100, "100文字以内で入力してください"),
  description: z.string().optional(),
  price: z
    .string()
    .min(1, "料金を入力してください")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "0円以上にしてください"),
  price_note: z.string().max(100).optional(),
  image_url: z.union([z.string().url(), z.literal("")]).optional(),
  capacity: z.string().optional(),
  category: z.string().optional(),
});

type MenuForm = z.infer<typeof menuSchema>;

// ─── Page ────────────────────────────────────────────────────

export default function EditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isPublished, setIsPublished] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MenuForm>({
    resolver: zodResolver(menuSchema),
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/menus/${id}`);
        if (!res.ok) {
          router.replace("/dashboard");
          return;
        }
        const { menu } = await res.json();
        reset({
          title: menu.title,
          description: menu.description ?? "",
          price: String(menu.price),
          price_note: menu.price_note ?? "",
          image_url: menu.image_url ?? "",
          capacity: menu.capacity ? String(menu.capacity) : "",
          category: menu.category ?? "",
        });
        setCustomFields((menu.custom_fields ?? []) as CustomField[]);
        setIsPublished(menu.is_published);
      } catch {
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, id, router, reset]);

  const imageUrl = watch("image_url");

  const onSubmit = async (data: MenuForm, publish?: boolean) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/menus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          price: Number(data.price),
          capacity: data.capacity ? Number(data.capacity) : null,
          image_url: data.image_url || null,
          custom_fields: customFields,
          is_published: publish ?? isPublished,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        let msg = result.error || "メニューの更新に失敗しました";
        if (result.details) {
          const detailMsgs = Object.entries(result.details)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join("\n");
          if (detailMsgs) msg += "\n\n" + detailMsgs;
        }
        alert(msg);
        return;
      }

      router.push("/dashboard");
    } catch {
      alert("ネットワークエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このメニューを削除しますか？この操作は取り消せません。")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/menus/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const { error } = await res.json();
        alert(error || "削除に失敗しました");
        return;
      }
      router.push("/dashboard");
    } catch {
      alert("ネットワークエラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            メニューを編集
          </h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              isPublished
                ? "bg-[#404040]/10 text-[#404040]"
                : "bg-[#F2F2F2] text-[#999999]"
            }`}
          >
            {isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {isPublished ? "公開中" : "下書き"}
          </span>
        </div>

        <form className="space-y-6">
          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              カバー画像
            </label>
            <ImageUpload
              value={imageUrl ?? ""}
              onChange={(url) => setValue("image_url", url)}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              メニュー名 <span className="text-red-500">*</span>
            </label>
            <Input
              {...register("title")}
              placeholder="例：パーソナルヨガ 60分コース"
              className="rounded-xl"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              説明
            </label>
            <Textarea
              {...register("description")}
              rows={4}
              placeholder="メニューの内容、特徴、対象者などを記載してください"
              className="rounded-xl"
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                <JapaneseYen className="inline h-3.5 w-3.5 mr-1" />
                料金 <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("price")}
                type="number"
                min="0"
                placeholder="0"
                className="rounded-xl"
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                料金備考
              </label>
              <Input
                {...register("price_note")}
                placeholder="例：税込 / 材料費別"
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              <Users className="inline h-3.5 w-3.5 mr-1" />
              定員（任意）
            </label>
            <Input
              {...register("capacity")}
              type="number"
              min="1"
              placeholder="空欄で無制限"
              className="rounded-xl"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              カテゴリ
            </label>
            <Input
              {...register("category")}
              placeholder="例：ヨガ / アロマ / 占い"
              className="rounded-xl"
            />
          </div>

          {/* Custom fields */}
          <CustomFieldsBuilder value={customFields} onChange={setCustomFields} />

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleSubmit((data) => onSubmit(data, false))}
              disabled={submitting}
              className="flex-1 h-12 rounded-xl"
            >
              {isPublished ? "非公開にする" : "下書き保存"}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, true))}
              disabled={submitting}
              className="flex-1 h-12 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111] gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {isPublished ? "更新する" : "公開する"}
            </Button>
          </div>

          {/* Delete */}
          <div className="pt-4 border-t border-[#E5E5E5]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              メニューを削除
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
