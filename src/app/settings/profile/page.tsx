"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save,
  Loader2,
  User,
  AtSign,
  FileText,
  ImageIcon,
  Instagram,
  Twitter,
  Globe,
  ChevronLeft,
  CheckCircle2,
  Facebook,
  ExternalLink,
  Camera,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header } from "@/components/header";
import { ImageUpload } from "@/components/image-upload";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { SnsLinks } from "@/types/database";

// ─── Schema ──────────────────────────────────────────────────────────────────

const profileFormSchema = z.object({
  username: z
    .string()
    .min(3, "ユーザー名は3文字以上にしてください")
    .max(30, "ユーザー名は30文字以内にしてください")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "英数字とアンダースコア（_）のみ使用できます"
    )
    .trim(),
  display_name: z
    .string()
    .max(50, "表示名は50文字以内にしてください")
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(500, "自己紹介は500文字以内にしてください")
    .nullable()
    .optional(),
  avatar_url: z
    .string()
    .url("有効なURLを入力してください")
    .nullable()
    .optional()
    .or(z.literal("")),
  sns_instagram: z
    .string()
    .url("有効なURLを入力してください")
    .nullable()
    .optional()
    .or(z.literal("")),
  sns_twitter: z
    .string()
    .url("有効なURLを入力してください")
    .nullable()
    .optional()
    .or(z.literal("")),
  sns_facebook: z
    .string()
    .url("有効なURLを入力してください")
    .nullable()
    .optional()
    .or(z.literal("")),
  sns_website: z
    .string()
    .url("有効なURLを入力してください")
    .nullable()
    .optional()
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// ─── Field components ─────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function FormField({
  label,
  optional,
  hint,
  children,
  icon,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[#999999]">{icon}</span>}
        <Label className="text-sm font-medium text-[#1A1A1A]">
          {label}
          {optional && (
            <span className="ml-1.5 text-xs font-normal text-[#999999]">
              （任意）
            </span>
          )}
        </Label>
      </div>
      {hint && (
        <p className="text-xs text-[#999999] pl-6 leading-relaxed">{hint}</p>
      )}
      <div>{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#F2F2F2]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#999999]">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

const inputCls =
  "h-10 rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA]";

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "",
      display_name: "",
      bio: "",
      avatar_url: "",
      sns_instagram: "",
      sns_twitter: "",
      sns_facebook: "",
      sns_website: "",
    },
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Populate form with profile data once loaded
  useEffect(() => {
    if (profile && !profileLoaded) {
      const sns = (profile.sns_links ?? {}) as SnsLinks;
      reset({
        username: profile.username,
        display_name: profile.display_name ?? "",
        bio: profile.bio ?? "",
        avatar_url: profile.avatar_url ?? "",
        sns_instagram: sns.instagram ?? "",
        sns_twitter: sns.twitter ?? "",
        sns_facebook: sns.facebook ?? "",
        sns_website: sns.website ?? "",
      });
      setProfileLoaded(true);
    }
  }, [profile, profileLoaded, reset]);

  const avatarUrl = watch("avatar_url");
  const displayName = watch("display_name");
  const username = watch("username");
  const bio = watch("bio");
  const initials = displayName
    ? displayName.slice(0, 1)
    : username?.slice(0, 1) ?? "？";
  const bioLength = bio?.length ?? 0;

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setServerError(null);
    setSaveSuccess(false);

    try {
      const supabase = createClient();
      const snsLinks: SnsLinks = {};
      if (data.sns_instagram) snsLinks.instagram = data.sns_instagram;
      if (data.sns_twitter) snsLinks.twitter = data.sns_twitter;
      if (data.sns_facebook) snsLinks.facebook = data.sns_facebook;
      if (data.sns_website) snsLinks.website = data.sns_website;

      const { error } = await supabase
        .from("profiles")
        .update({
          username: data.username,
          display_name: data.display_name || null,
          bio: data.bio || null,
          avatar_url: data.avatar_url || null,
          sns_links: Object.keys(snsLinks).length > 0 ? snsLinks : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        if (error.code === "23505") {
          setServerError("このユーザー名はすでに使われています。");
        } else {
          setServerError("保存に失敗しました。もう一度お試しください。");
        }
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      setServerError("保存に失敗しました。もう一度お試しください。");
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 pb-28 sm:pb-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          ダッシュボードへ戻る
        </Link>

        <div className="mb-8">
          <h1
            className="text-2xl font-bold text-[#1A1A1A]"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            プロフィール設定
          </h1>
          <p className="mt-1 text-sm text-[#999999]">
            イベントページや公開プロフィールに表示される情報を編集できます
          </p>
        </div>

        {/* Success toast */}
        {saveSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[#404040]/10 border border-[#404040]/20 px-4 py-3 animate-in fade-in-0 slide-in-from-top-2">
            <CheckCircle2 className="h-5 w-5 text-[#404040] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#404040]">
                プロフィールを保存しました
              </p>
              <p className="text-xs text-[#404040]/70 mt-0.5">
                変更内容が公開プロフィールに反映されます
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Avatar section */}
          <SectionCard title="アバター">
            <div className="flex items-start gap-6">
              {/* Avatar preview */}
              <div className="relative shrink-0">
                <Avatar className="size-20 ring-4 ring-[#E5E5E5]">
                  {avatarUrl && (
                    <AvatarImage
                      src={avatarUrl}
                      alt={displayName ?? username ?? ""}
                    />
                  )}
                  <AvatarFallback className="text-3xl font-bold bg-[#F7F7F7] text-[#1A1A1A]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1A1A] text-white shadow-md">
                  <Camera className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] mb-1">
                  アバター画像
                  <span className="ml-1.5 text-xs font-normal text-[#999999]">
                    （任意）
                  </span>
                </p>
                <ImageUpload
                  value={avatarUrl ?? ""}
                  onChange={(url) => {
                    setValue("avatar_url", url, { shouldDirty: true });
                  }}
                />
                <FieldError message={errors.avatar_url?.message} />
              </div>
            </div>
          </SectionCard>

          {/* Basic info */}
          <SectionCard title="基本情報">
            <div className="space-y-5">
              <FormField
                label="表示名"
                optional
                hint="イベントページや公開プロフィールに表示される名前です"
                icon={<User className="h-4 w-4" />}
              >
                <Input
                  placeholder="例：田中 さくら"
                  aria-invalid={!!errors.display_name}
                  {...register("display_name")}
                  className={inputCls}
                />
                <FieldError message={errors.display_name?.message} />
              </FormField>

              <FormField
                label="ユーザー名"
                hint={`公開URLは /${username || "username"} になります`}
                icon={<AtSign className="h-4 w-4" />}
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#999999]">
                    @
                  </span>
                  <Input
                    placeholder="sakura_t"
                    aria-invalid={!!errors.username}
                    {...register("username")}
                    className={`${inputCls} pl-7`}
                  />
                </div>
                <FieldError message={errors.username?.message} />
              </FormField>

              <FormField
                label="自己紹介"
                optional
                icon={<FileText className="h-4 w-4" />}
              >
                <Textarea
                  placeholder="例：ヨガインストラクター歴10年。初心者の方も大歓迎です。"
                  rows={4}
                  aria-invalid={!!errors.bio}
                  {...register("bio")}
                  className="rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA] resize-none"
                />
                <div className="flex items-center justify-between mt-1">
                  <FieldError message={errors.bio?.message} />
                  <span className="text-xs text-[#999999] ml-auto">
                    {bioLength}/500
                  </span>
                </div>
              </FormField>
            </div>
          </SectionCard>

          {/* SNS links */}
          <SectionCard title="SNS・リンク">
            <div className="space-y-4">
              {[
                {
                  key: "sns_instagram" as const,
                  label: "Instagram",
                  icon: <Instagram className="h-4 w-4" />,
                  placeholder: "https://instagram.com/your_handle",
                },
                {
                  key: "sns_twitter" as const,
                  label: "Twitter / X",
                  icon: <Twitter className="h-4 w-4" />,
                  placeholder: "https://twitter.com/your_handle",
                },
                {
                  key: "sns_facebook" as const,
                  label: "Facebook",
                  icon: <Facebook className="h-4 w-4" />,
                  placeholder: "https://facebook.com/your_profile",
                },
                {
                  key: "sns_website" as const,
                  label: "ウェブサイト",
                  icon: <Globe className="h-4 w-4" />,
                  placeholder: "https://your-website.com",
                },
              ].map((field) => (
                <FormField
                  key={field.key}
                  label={field.label}
                  optional
                  icon={field.icon}
                >
                  <Input
                    type="url"
                    placeholder={field.placeholder}
                    aria-invalid={!!errors[field.key]}
                    {...register(field.key)}
                    className={inputCls}
                  />
                  <FieldError message={errors[field.key]?.message} />
                </FormField>
              ))}
            </div>
          </SectionCard>

          {/* 連携サービス */}
          <SectionCard title="連携サービス">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755]/10">
                  <svg
                    className="h-5 w-5 text-[#06C755]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    LINE公式アカウント
                  </p>
                  <p className="text-xs text-[#999999]">
                    イベント作成時にフォロワーへ自動通知
                  </p>
                </div>
              </div>
              <Link href="/settings/line">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs gap-1.5 border-[#E5E5E5] hover:border-[#1A1A1A]/30 shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  設定する
                </Button>
              </Link>
            </div>
          </SectionCard>

          {/* Instagram link page */}
          <SectionCard title="Instagram用リンク">
            <div className="space-y-3">
              <p className="text-sm text-[#999999] leading-relaxed">
                Instagramのプロフィールに貼れるリンクページです。公開中のイベントが一覧表示されます。
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] px-3 py-2.5">
                  <p className="text-sm text-[#1A1A1A] truncate">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/${username || "username"}/links`
                      : `/${username || "username"}/links`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full gap-1.5 border-[#E5E5E5] hover:border-[#1A1A1A]/30 shrink-0"
                  onClick={async () => {
                    const linkUrl = `${window.location.origin}/${username || "username"}/links`;
                    try {
                      await navigator.clipboard.writeText(linkUrl);
                    } catch {
                      const textarea = document.createElement("textarea");
                      textarea.value = linkUrl;
                      textarea.style.position = "fixed";
                      textarea.style.opacity = "0";
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand("copy");
                      document.body.removeChild(textarea);
                    }
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                >
                  {linkCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      URLをコピー
                    </>
                  )}
                </Button>
              </div>
              <Link
                href={`/${username || "username"}/links`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#1A1A1A] transition-colors"
              >
                <Link2 className="h-3 w-3" />
                リンクページをプレビュー
              </Link>
            </div>
          </SectionCard>

          {/* Public profile preview */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-[#999999]">公開プロフィールURL</p>
              <p className="text-sm font-medium text-[#1A1A1A] mt-0.5">
                プチイベント作成くん.jp/{username || "username"}
              </p>
            </div>
            <Link href={`/${username || "username"}`} target="_blank">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full text-xs gap-1.5 border-[#E5E5E5] hover:border-[#1A1A1A]/30 shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
                プロフィールを確認
              </Button>
            </Link>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm text-red-500">{serverError}</p>
            </div>
          )}

          {/* Desktop submit buttons */}
          <div className="hidden sm:flex items-center justify-end gap-3 pt-2">
            <Link href="/dashboard">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#E5E5E5]"
              >
                キャンセル
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="h-10 px-6 rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-2 disabled:opacity-60 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  変更を保存する
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      {/* Mobile sticky bottom bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 border-t border-[#E5E5E5] bg-white/95 backdrop-blur-sm px-4 py-3 flex gap-3 z-20">
        <Link href="/dashboard" className="flex-1">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full border-[#E5E5E5]"
          >
            キャンセル
          </Button>
        </Link>
        <Button
          type="submit"
          form="profile-form"
          disabled={isSubmitting || !isDirty}
          onClick={handleSubmit(onSubmit)}
          className="flex-1 rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] gap-2 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存する
            </>
          )}
        </Button>
      </div>

      <footer className="border-t border-[#E5E5E5] py-6 text-center text-xs text-[#999999] hidden sm:block">
        <p>© 2026 プチイベント作成くん</p>
      </footer>
    </div>
  );
}
