"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  JapaneseYen,
  Loader2,
  Eye,
  LogIn,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";
import { LoginDialog } from "@/components/login-dialog";
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

export default function NewMenuPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MenuForm>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "0",
      price_note: "",
      image_url: "",
      capacity: "",
      category: "",
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLoginOpen(true);
    }
  }, [authLoading, user]);

  const imageUrl = watch("image_url");

  const onSubmit = async (data: MenuForm, isPublished: boolean) => {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          price: Number(data.price),
          capacity: data.capacity ? Number(data.capacity) : null,
          image_url: data.image_url || null,
          custom_fields: customFields,
          is_published: isPublished,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        let msg = result.error || "メニューの作成に失敗しました";
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

  if (authLoading) {
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
        <h1
          className="text-2xl font-bold text-[#1A1A1A] mb-6"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          サービスメニューを作成
        </h1>

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
              下書き保存
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
              公開する
            </Button>
          </div>
        </form>
      </main>

      {!user && (
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      )}
    </div>
  );
}
