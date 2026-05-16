"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  MapPin,
  Users,
  JapaneseYen,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Video,
  Shield,
  Lock,
  UserPlus,
  Link2,
  Check,
  X,
  Mail,
  CreditCard,
  Banknote,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import { PaymentMethodsField } from "@/components/payment-methods-field";
import { CategoryPicker } from "@/components/category-picker";
import { TagPicker } from "@/components/tag-picker";
import { CustomQuestionsEditor } from "@/components/custom-questions-editor";
import { parseCustomQuestions, type CustomQuestion } from "@/lib/custom-questions";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const editEventBaseSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(100, "100文字以内で入力してください"),
  description: z.string().min(1, "説明を入力してください"),
  datetime: z.string().min(1, "日時を入力してください"),
  booking_deadline: z.string().optional(),
  location: z.string().optional(),
  location_type: z.enum(["physical", "online", "hybrid"]),
  online_url: z.string().optional(),
  zoom_meeting_id: z.string().optional(),
  zoom_passcode: z.string().optional(),
  location_url: z.string().optional(),
  capacity: z
    .string()
    .min(1, "定員を入力してください")
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) >= 1,
      "1名以上にしてください"
    ),
  capacity_physical: z.string().optional(),
  capacity_online: z.string().optional(),
  price: z
    .string()
    .min(1, "料金を入力してください")
    .refine(
      (v) => !isNaN(Number(v)) && Number(v) >= 0,
      "0円以上にしてください"
    ),
  image_url: z
    .union([z.string().url("有効なURLを入力してください"), z.literal("")])
    .optional(),
  price_note: z.string().max(100).optional(),
  payment_method: z.enum(['stripe', 'bank', 'onsite', 'custom']).optional(),
  payment_methods: z.array(z.enum(['stripe', 'bank', 'onsite', 'custom'])).optional(),
  payment_link: z.string().optional(),
  payment_info: z.string().max(500).optional(),
  payment_deadline_days: z.string().optional(),
  bank_name: z.string().max(100).optional(),
  bank_branch: z.string().max(100).optional(),
  bank_account_type: z.string().max(20).optional(),
  bank_account_number: z.string().max(50).optional(),
  bank_account_holder: z.string().max(100).optional(),
  bank_note: z.string().max(500).optional(),
  is_limited: z.boolean().optional(),
  limited_passcode: z.string().max(50).optional(),
  teacher_name: z.string().optional(),
  teacher_bio: z.string().optional(),
});

const editEventSchema = editEventBaseSchema.refine(
  (data) => {
    if (data.location_type === "physical" || data.location_type === "hybrid") {
      return !!data.location;
    }
    return true;
  },
  { message: "場所を入力してください", path: ["location"] }
).refine(
  (data) => {
    if (data.location_type === "online" || data.location_type === "hybrid") {
      if (data.online_url && data.online_url.length > 0) {
        try { new URL(data.online_url); return true; } catch { return false; }
      }
    }
    return true;
  },
  { message: "有効なURLを入力してください", path: ["online_url"] }
).refine(
  (data) => {
    if (data.location_type !== "hybrid") return true;
    const p = Number(data.capacity_physical);
    return !isNaN(p) && p >= 1;
  },
  { message: "リアル参加の定員を1名以上で入力してください", path: ["capacity_physical"] }
).refine(
  (data) => {
    if (data.location_type !== "hybrid") return true;
    const o = Number(data.capacity_online);
    return !isNaN(o) && o >= 1;
  },
  { message: "オンライン参加の定員を1名以上で入力してください", path: ["capacity_online"] }
);

type EditEventFormValues = z.infer<typeof editEventBaseSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-[#E5E5E5] overflow-hidden">
      <div className="px-6 py-3.5 border-b border-[#F2F2F2]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#999999]">
          {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function FieldWrapper({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-[#1A1A1A]">{label}</span>
        {required && <span className="text-[#1A1A1A] text-sm">*</span>}
        {optional && (
          <span className="text-xs text-[#999999] font-normal">（任意）</span>
        )}
      </div>
      {hint && (
        <p className="text-xs text-[#999999] leading-relaxed">{hint}</p>
      )}
      {children}
    </div>
  );
}

// ─── Co-admin section ─────────────────────────────────────────────────────────

type AdminRecord = {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string | null;
  status: string;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
};

function CoAdminSection({ eventId, isCreator }: { eventId: string; isCreator: boolean }) {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    fetchAdmins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function fetchAdmins() {
    try {
      const res = await fetch(`/api/events/${eventId}/admins`);
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleInviteByEmail() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    setInviteUrl(null);
    try {
      const res = await fetch(`/api/events/${eventId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "招待に失敗しました");
        return;
      }
      setInviteEmail("");
      setInviteUrl(data.invite_url);
      fetchAdmins();
    } catch {
      setInviteError("招待に失敗しました");
    } finally {
      setInviting(false);
    }
  }

  async function handleGenerateLink() {
    setGeneratingLink(true);
    setInviteError(null);
    setInviteUrl(null);
    try {
      const res = await fetch(`/api/events/${eventId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error ?? "リンクの生成に失敗しました");
        return;
      }
      setInviteUrl(data.invite_url);
      fetchAdmins();
    } catch {
      setInviteError("リンクの生成に失敗しました");
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleRemoveAdmin(adminId: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/admins/${adminId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAdmins((prev) => prev.filter((a) => a.id !== adminId));
      }
    } catch {
      // ignore
    }
  }

  function handleCopyUrl() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isCreator) return null;

  return (
    <FormSection title="共同管理者">
      <div className="space-y-4">
        {/* Current admins list */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#999999]">
            <Loader2 className="h-4 w-4 animate-spin" />
            読み込み中...
          </div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-[#999999]">
            共同管理者はまだいません。メールアドレスまたは招待リンクで追加できます。
          </p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5E5E5] text-xs font-bold text-[#1A1A1A]">
                    {admin.profile?.display_name
                      ? admin.profile.display_name.slice(0, 1)
                      : admin.email
                      ? admin.email.slice(0, 1).toUpperCase()
                      : "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">
                      {admin.profile?.display_name ?? admin.email ?? "招待リンク"}
                    </p>
                    <p className="text-xs text-[#999999]">
                      {admin.status === "accepted" ? (
                        <span className="text-green-600">参加中</span>
                      ) : (
                        <span className="text-amber-600">招待中</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAdmin(admin.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#999999] hover:bg-red-50 hover:text-red-500 transition-colors"
                  aria-label="削除"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Invite by email */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#1A1A1A]">メールアドレスで招待</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
              <input
                type="email"
                placeholder="example@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInviteByEmail();
                  }
                }}
                className="h-10 w-full rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] pl-9 pr-3 text-sm focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]/20"
              />
            </div>
            <Button
              type="button"
              onClick={handleInviteByEmail}
              disabled={inviting || !inviteEmail.trim()}
              className="h-10 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111] gap-1.5 shrink-0"
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              招待
            </Button>
          </div>
        </div>

        {/* Generate invite link */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#1A1A1A]">招待リンクで招待</p>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateLink}
            disabled={generatingLink}
            className="h-10 rounded-xl border-[#E5E5E5] gap-1.5 text-sm text-[#666666] hover:text-[#1A1A1A] hover:border-[#1A1A1A]/30"
          >
            {generatingLink ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            招待リンクを生成
          </Button>
        </div>

        {/* Generated invite URL */}
        {inviteUrl && (
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3">
            <p className="text-xs text-[#999999] mb-2">招待リンク（このリンクを共有してください）</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 h-9 rounded-lg border border-[#E5E5E5] bg-white px-3 text-xs text-[#1A1A1A] select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="h-9 rounded-lg gap-1.5 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    コピー済
                  </>
                ) : (
                  <>
                    <Link2 className="h-3.5 w-3.5" />
                    コピー
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {inviteError && (
          <p className="text-xs text-red-500">{inviteError}</p>
        )}
      </div>
    </FormSection>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      <div className="sticky top-0 z-10 border-b border-[#E5E5E5] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-[#E5E5E5]" />
          <div className="h-7 w-20 animate-pulse rounded-full bg-[#E5E5E5]" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-2xl bg-[#E5E5E5]"
          />
        ))}
      </div>
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [originalCapacity, setOriginalCapacity] = useState<number | null>(null);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [pendingPayload, setPendingPayload] = useState<unknown | null>(null);
  const [promotionPreview, setPromotionPreview] = useState<{
    increase: number;
    willPromote: number;
  } | null>(null);
  const [promotedToast, setPromotedToast] = useState<{
    count: number;
    names: string[];
  } | null>(null);
  const [promotionSubmitting, setPromotionSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    trigger,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditEventFormValues>({
    resolver: zodResolver(editEventSchema),
    defaultValues: {
      location_type: "physical",
    },
  });
  const [savingDraft, setSavingDraft] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  const watchedLocationType = watch("location_type");
  const watchedIsLimited = watch("is_limited");
  const watchedPrice = watch("price");
  const watchedPaymentMethod = watch("payment_method");
  const watchedValues = watch();

  // ── Load existing event ───────────────────────────────────────────────────

  useEffect(() => {
    // Wait for auth context to finish loading; otherwise `user` is null on
    // first render and every permission branch below fails, causing a
    // false "no permission" screen for legitimate creators / admins.
    if (authLoading) return;

    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        const event = json.event;

        const toLocal = (iso?: string | null): string => {
          if (!iso) return "";
          try {
            const d = new Date(iso);
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          } catch {
            return iso;
          }
        };
        const datetimeLocal = toLocal(event.datetime);
        const deadlineLocal = toLocal(event.booking_deadline);

        setOriginalCapacity(
          typeof event.capacity === "number" ? event.capacity : null
        );
        setWaitlistCount(
          typeof event.waitlist_count === "number" ? event.waitlist_count : 0
        );

        reset({
          title: event.title ?? "",
          description: event.description ?? "",
          datetime: datetimeLocal,
          booking_deadline: deadlineLocal,
          location: event.location ?? "",
          location_type: event.location_type ?? "physical",
          online_url: event.online_url ?? "",
          zoom_meeting_id: event.zoom_meeting_id ?? "",
          zoom_passcode: event.zoom_passcode ?? "",
          location_url: event.location_url ?? "",
          capacity: String(event.capacity ?? 10),
          capacity_physical:
            event.capacity_physical != null
              ? String(event.capacity_physical)
              : "",
          capacity_online:
            event.capacity_online != null
              ? String(event.capacity_online)
              : "",
          price: String(event.price ?? 0),
          image_url: event.image_url ?? "",
          price_note: event.price_note ?? "",
          payment_method: event.payment_method ?? "stripe",
          payment_methods: (event.payment_methods as ("stripe"|"bank"|"onsite"|"custom")[] | null) ??
            (event.payment_method ? [event.payment_method as "stripe"|"bank"|"onsite"|"custom"] : ["stripe"]),
          payment_link: event.payment_link ?? "",
          payment_info: event.payment_info ?? "",
          payment_deadline_days: event.payment_deadline_days ? String(event.payment_deadline_days) : "",
          bank_name: event.bank_name ?? "",
          bank_branch: event.bank_branch ?? "",
          bank_account_type: event.bank_account_type ?? "普通",
          bank_account_number: event.bank_account_number ?? "",
          bank_account_holder: event.bank_account_holder ?? "",
          bank_note: event.bank_note ?? "",
          is_limited: event.is_limited ?? false,
          limited_passcode: event.limited_passcode ?? "",
          teacher_name: event.teacher_name ?? "",
          teacher_bio: event.teacher_bio ?? "",
        });
        setIsPublished(event.is_published ?? true);
        setCategoryId(
          typeof event.category_id === "number" ? event.category_id : null
        );
        setCustomQuestions(
          parseCustomQuestions((event as { custom_questions?: unknown }).custom_questions)
        );
        // Load existing tag assignments
        try {
          const supabase = createClient();
          const { data: assignments } = await (
            supabase.from as unknown as (
              t: string
            ) => ReturnType<typeof supabase.from>
          )("event_tag_assignments")
            .select("tag_id")
            .eq("event_id", eventId);
          if (assignments) {
            setTagIds(
              (assignments as Array<{ tag_id: number }>).map((a) => a.tag_id)
            );
          }
        } catch {
          // graceful fallback when assignments table inaccessible
        }
        if (user && event.creator_id === user.id) {
          setIsCreator(true);
          setCanEdit(true);
        } else if (user) {
          // Check co-admin or super-admin access
          const supabase = createClient();
          const { data: adminRecord } = await supabase
            .from("event_admins")
            .select("id")
            .eq("event_id", eventId)
            .eq("user_id", user.id)
            .eq("status", "accepted")
            .maybeSingle();
          if (adminRecord) {
            setCanEdit(true);
          } else {
            // Check super-admin by email
            const SUPER_ADMIN_EMAILS = ["imatoru@gmail.com"];
            if (SUPER_ADMIN_EMAILS.includes(user.email ?? "")) {
              setCanEdit(true);
            }
          }
        }
      } catch {
        setServerError("イベントの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [eventId, reset, user, authLoading]);

  // ── Draft Save ─────────────────────────────────────────────────────────────

  const saveDraft = async () => {
    setServerError(null);
    setSaveSuccess(false);
    const ok = await trigger("title");
    if (!ok) {
      setError("title", { message: "下書き保存にはタイトルが必要です" });
      return;
    }
    const data = getValues();
    setSavingDraft(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          save_as_draft: true,
          title: data.title,
          description: data.description || undefined,
          datetime: data.datetime ? new Date(data.datetime).toISOString() : undefined,
          booking_deadline: data.booking_deadline ? new Date(data.booking_deadline).toISOString() : null,
          location: data.location || undefined,
          location_type: data.location_type ?? "physical",
          online_url: data.online_url || undefined,
          zoom_meeting_id: data.zoom_meeting_id || undefined,
          zoom_passcode: data.zoom_passcode || undefined,
          location_url: data.location_url || undefined,
          capacity:
            data.location_type === "hybrid"
              ? (Number(data.capacity_physical) || 0) +
                (Number(data.capacity_online) || 0) || undefined
              : data.capacity
              ? Number(data.capacity)
              : undefined,
          capacity_physical:
            data.location_type === "hybrid" && data.capacity_physical
              ? Number(data.capacity_physical)
              : undefined,
          capacity_online:
            data.location_type === "hybrid" && data.capacity_online
              ? Number(data.capacity_online)
              : undefined,
          price: data.price ? Number(data.price) : 0,
          image_url: data.image_url || undefined,
          price_note: data.price_note || undefined,
          payment_methods: data.payment_methods,
          payment_deadline_days: data.payment_deadline_days ? Number(data.payment_deadline_days) : undefined,
          bank_name: data.bank_name || undefined,
          bank_branch: data.bank_branch || undefined,
          bank_account_type: data.bank_account_type || undefined,
          bank_account_number: data.bank_account_number || undefined,
          bank_account_holder: data.bank_account_holder || undefined,
          bank_note: data.bank_note || undefined,
          is_limited: data.is_limited || false,
          limited_passcode: data.is_limited ? data.limited_passcode : undefined,
          teacher_name: data.teacher_name,
          teacher_bio: data.teacher_bio,
          custom_questions: customQuestions,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "下書きの保存に失敗しました");
        return;
      }
      setIsPublished(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setServerError("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const onSubmit = async (data: EditEventFormValues) => {
    setServerError(null);
    setSaveSuccess(false);

    const payload = {
      title: data.title,
      description: data.description,
      datetime: new Date(data.datetime).toISOString(),
      booking_deadline: data.booking_deadline ? new Date(data.booking_deadline).toISOString() : null,
      location: data.location || undefined,
      location_type: data.location_type ?? "physical",
      online_url: data.online_url || undefined,
      zoom_meeting_id: data.zoom_meeting_id || undefined,
      zoom_passcode: data.zoom_passcode || undefined,
      location_url: data.location_url || undefined,
      capacity:
        data.location_type === "hybrid"
          ? (Number(data.capacity_physical) || 0) +
            (Number(data.capacity_online) || 0)
          : Number(data.capacity),
      capacity_physical:
        data.location_type === "hybrid"
          ? Number(data.capacity_physical)
          : null,
      capacity_online:
        data.location_type === "hybrid"
          ? Number(data.capacity_online)
          : null,
      price: Number(data.price),
      image_url: data.image_url || undefined,
      price_note: data.price_note || undefined,
      payment_method: Number(data.price) > 0 ? (data.payment_method || 'stripe') : undefined,
      payment_methods: Number(data.price) > 0 && data.payment_methods && data.payment_methods.length > 0
        ? data.payment_methods
        : undefined,
      payment_link: (data.payment_methods?.includes('custom') || data.payment_method === 'custom')
        ? (data.payment_link || undefined)
        : undefined,
      payment_info: (data.payment_methods?.includes('custom') || data.payment_method === 'custom')
        ? (data.payment_info || undefined)
        : undefined,
      payment_deadline_days: data.payment_deadline_days ? Number(data.payment_deadline_days) : undefined,
      bank_name: data.payment_methods?.includes('bank') ? (data.bank_name || undefined) : undefined,
      bank_branch: data.payment_methods?.includes('bank') ? (data.bank_branch || undefined) : undefined,
      bank_account_type: data.payment_methods?.includes('bank') ? (data.bank_account_type || undefined) : undefined,
      bank_account_number: data.payment_methods?.includes('bank') ? (data.bank_account_number || undefined) : undefined,
      bank_account_holder: data.payment_methods?.includes('bank') ? (data.bank_account_holder || undefined) : undefined,
      bank_note: data.payment_methods?.includes('bank') ? (data.bank_note || undefined) : undefined,
      is_limited: data.is_limited || false,
      limited_passcode: data.is_limited ? (data.limited_passcode || undefined) : undefined,
      teacher_name: data.teacher_name,
      teacher_bio: data.teacher_bio,
      is_published: isPublished,
      category_id: categoryId ?? null,
      tag_ids: tagIds,
      custom_questions: customQuestions,
    };

    // If capacity increased AND there are waitlisted bookings, ask for
    // confirmation before promoting them. Capacity decreases or no waitlist
    // → fall through and submit immediately.
    const newCapacity = Number(data.capacity);
    if (
      isPublished &&
      typeof originalCapacity === "number" &&
      newCapacity > originalCapacity &&
      waitlistCount > 0
    ) {
      const increase = newCapacity - originalCapacity;
      const willPromote = Math.min(increase, waitlistCount);
      setPendingPayload(payload);
      setPromotionPreview({ increase, willPromote });
      return;
    }

    await submitPayload(payload);
  };

  const submitPayload = async (payload: unknown) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "イベントの更新に失敗しました");
        return;
      }

      const promotedCount = Number(json.promoted_count ?? 0);
      const promotedNames: string[] = Array.isArray(json.promoted_names)
        ? json.promoted_names
        : [];

      if (promotedCount > 0) {
        // Show toast and let user read it before redirecting
        setPromotedToast({ count: promotedCount, names: promotedNames });
        setSaveSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 4000);
      } else {
        setSaveSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch {
      setServerError(
        "ネットワークエラーが発生しました。もう一度お試しください。"
      );
    }
  };

  const confirmPromotion = async () => {
    if (!pendingPayload) return;
    const payload = pendingPayload;
    setPromotionSubmitting(true);
    try {
      await submitPayload(payload);
    } finally {
      setPromotionSubmitting(false);
      setPendingPayload(null);
      setPromotionPreview(null);
    }
  };

  const cancelPromotion = () => {
    setPendingPayload(null);
    setPromotionPreview(null);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setServerError(json.error ?? "イベントの削除に失敗しました");
        setShowDeleteDialog(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setServerError(
        "ネットワークエラーが発生しました。もう一度お試しください。"
      );
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  if (!loading && user && !canEdit && !notFound) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#FAFAFA] px-4">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-lg font-bold text-[#1A1A1A] mb-2">
          このイベントの編集権限がありません
        </p>
        <p className="text-sm text-[#999999] mb-6">
          イベントの作成者または共同管理者のみ編集できます。
        </p>
        <Button
          variant="outline"
          className="rounded-full border-[#E5E5E5] hover:border-[#1A1A1A]/30"
          onClick={() => router.push("/dashboard")}
        >
          ダッシュボードに戻る
        </Button>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#FAFAFA] px-4">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-lg font-bold text-[#1A1A1A] mb-2">
          イベントが見つかりませんでした
        </p>
        <p className="text-sm text-[#999999] mb-6">
          URLを確認するか、ダッシュボードから操作してください。
        </p>
        <Button
          variant="outline"
          className="rounded-full border-[#E5E5E5] hover:border-[#1A1A1A]/30"
          onClick={() => router.push("/dashboard")}
        >
          ダッシュボードに戻る
        </Button>
      </main>
    );
  }

  const inputCls =
    "h-10 rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA]";
  const inputWithIconCls = `${inputCls} pl-9`;

  return (
    <>
      <main className="min-h-dvh bg-[#FAFAFA]">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b border-[#E5E5E5] bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                aria-label="戻る"
                className="h-8 w-8 p-0 rounded-xl text-[#999999] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-[#1A1A1A] truncate">
                  イベントを編集
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Preview link */}
              <a
                href={`/events/${eventId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#E5E5E5] px-3 py-1.5 text-xs text-[#999999] hover:text-[#1A1A1A] hover:border-[#1A1A1A]/30 transition-all"
              >
                <ExternalLink className="h-3 w-3" />
                プレビュー
              </a>

              {/* Publish toggle */}
              <button
                type="button"
                onClick={() => setIsPublished((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all border ${
                  isPublished
                    ? "bg-[#404040]/10 text-[#404040] border-[#404040]/20 hover:bg-[#404040]/20"
                    : "bg-[#F2F2F2] text-[#999999] border-[#E5E5E5] hover:bg-[#E5E5E5]"
                }`}
              >
                {isPublished ? (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    公開中
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    下書き
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Save success banner */}
        {saveSuccess && (
          <div className="mx-auto max-w-3xl px-4 pt-4">
            {promotedToast ? (
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 animate-in fade-in-0 slide-in-from-top-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-900 leading-relaxed">
                  <p className="font-bold">
                    キャンセル待ち {promotedToast.count} 名を繰り上げ・通知しました
                  </p>
                  {promotedToast.names.length > 0 && (
                    <p className="mt-1 text-xs text-emerald-800/80">
                      対象: {promotedToast.names.join("、")} さん（メールで参加確定をお知らせ済み）
                    </p>
                  )}
                  <p className="mt-1 text-xs text-emerald-800/80">
                    ダッシュボードに戻ります…
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl bg-[#404040]/10 border border-[#404040]/20 px-4 py-3 animate-in fade-in-0 slide-in-from-top-2">
                <CheckCircle2 className="h-5 w-5 text-[#404040] shrink-0" />
                <p className="text-sm font-medium text-[#404040]">
                  保存しました。ダッシュボードに戻ります…
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mx-auto max-w-3xl px-4 py-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Basic info */}
            <FormSection title="基本情報">
              <div className="space-y-5">
                <FieldWrapper label="イベントタイトル" required>
                  <Input
                    placeholder="例：🌿 体験ヨガレッスン｜初心者歓迎"
                    aria-invalid={!!errors.title}
                    {...register("title")}
                    className={inputCls}
                  />
                  <FieldError message={errors.title?.message} />
                </FieldWrapper>

                <FieldWrapper label="イベントの説明" required>
                  <Textarea
                    placeholder="どんなイベントか、持ち物、注意事項など詳しく書いてみましょう"
                    rows={6}
                    aria-invalid={!!errors.description}
                    {...register("description")}
                    className="rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA] resize-none"
                  />
                  <FieldError message={errors.description?.message} />
                </FieldWrapper>
              </div>
            </FormSection>

            {/* Date / Location */}
            <FormSection title="日時・場所">
              <div className="space-y-5">
                <FieldWrapper label="開催日時" required>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]" />
                    <Input
                      type="datetime-local"
                      aria-invalid={!!errors.datetime}
                      {...register("datetime")}
                      className={inputWithIconCls}
                    />
                  </div>
                  <FieldError message={errors.datetime?.message} />
                </FieldWrapper>

                <FieldWrapper
                  label="申し込み締め切り"
                  hint="未指定の場合は開催開始時刻まで受付可能"
                >
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999999]" />
                    <Input
                      type="datetime-local"
                      {...register("booking_deadline")}
                      className={inputWithIconCls}
                    />
                  </div>
                </FieldWrapper>

                <FieldWrapper label="開催形式" required>
                  <div className="flex gap-2">
                    {([
                      { value: "physical", label: "対面", icon: MapPin },
                      { value: "online", label: "オンライン", icon: Video },
                      { value: "hybrid", label: "ハイブリッド", icon: Users },
                    ] as const).map((opt) => {
                      const isSelected = watchedLocationType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setValue("location_type", opt.value, { shouldDirty: true })}
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                              : "border-[#E5E5E5] bg-white text-[#999999] hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A]"
                          }`}
                        >
                          <opt.icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </FieldWrapper>

                {(watchedLocationType === "physical" || watchedLocationType === "hybrid") && (
                  <FieldWrapper label="場所・会場" required>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]" />
                      <Input
                        placeholder="例：渋谷区○○スタジオ"
                        aria-invalid={!!errors.location}
                        {...register("location")}
                        className={inputWithIconCls}
                      />
                    </div>
                    <FieldError message={errors.location?.message} />
                  </FieldWrapper>
                )}

                {(watchedLocationType === "online" || watchedLocationType === "hybrid") && (
                  <>
                    <FieldWrapper
                      label="オンラインURL"
                      hint="Zoom, Google Meet, Teams などのURLを入力"
                    >
                      <div className="relative">
                        <Video className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]" />
                        <Input
                          placeholder="例：https://zoom.us/j/..."
                          aria-invalid={!!errors.online_url}
                          {...register("online_url")}
                          className={inputWithIconCls}
                        />
                      </div>
                      <FieldError message={errors.online_url?.message} />
                    </FieldWrapper>

                    <div className="grid grid-cols-2 gap-3">
                      <FieldWrapper
                        label="ミーティングID"
                        optional
                        hint="Zoom等のID"
                      >
                        <Input
                          placeholder="例：123 456 7890"
                          {...register("zoom_meeting_id")}
                          className={inputCls}
                        />
                      </FieldWrapper>
                      <FieldWrapper
                        label="パスコード"
                        optional
                        hint="参加用パスワード"
                      >
                        <Input
                          placeholder="例：abc123"
                          {...register("zoom_passcode")}
                          className={inputCls}
                        />
                      </FieldWrapper>
                    </div>
                  </>
                )}

                {(watchedLocationType === "physical" || watchedLocationType === "hybrid") && (
                  <FieldWrapper
                    label="地図URL"
                    optional
                    hint="Google Maps などの地図リンクを入力"
                  >
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]" />
                      <Input
                        placeholder="例：https://maps.google.com/..."
                        {...register("location_url")}
                        className={inputWithIconCls}
                      />
                    </div>
                  </FieldWrapper>
                )}
              </div>
            </FormSection>

            {/* Capacity / Price */}
            <FormSection title="定員・料金">
              <div className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  {watchedLocationType === "hybrid" ? (
                    <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                      <FieldWrapper label="リアル参加の定員（名）" required hint="会場で参加する人の上限">
                        <div className="relative">
                          <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
                          <Input
                            type="number"
                            min={1}
                            max={10000}
                            aria-invalid={!!errors.capacity_physical}
                            {...register("capacity_physical")}
                            className={inputWithIconCls}
                          />
                        </div>
                        <FieldError message={errors.capacity_physical?.message} />
                      </FieldWrapper>
                      <FieldWrapper label="オンライン参加の定員（名）" required hint="オンラインで参加する人の上限">
                        <div className="relative">
                          <Video className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-700" />
                          <Input
                            type="number"
                            min={1}
                            max={10000}
                            aria-invalid={!!errors.capacity_online}
                            {...register("capacity_online")}
                            className={inputWithIconCls}
                          />
                        </div>
                        <FieldError message={errors.capacity_online?.message} />
                      </FieldWrapper>
                      <p className="sm:col-span-2 text-xs text-[#999999]">
                        合計定員: {(Number(watch("capacity_physical")) || 0) + (Number(watch("capacity_online")) || 0)} 名
                      </p>
                    </div>
                  ) : (
                    <FieldWrapper label="定員（名）" required>
                      <div className="relative">
                        <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]" />
                        <Input
                          type="number"
                          min={1}
                          max={10000}
                          aria-invalid={!!errors.capacity}
                          {...register("capacity")}
                          className={inputWithIconCls}
                        />
                      </div>
                      <FieldError message={errors.capacity?.message} />
                    </FieldWrapper>
                  )}

                  <FieldWrapper
                    label="参加費（円）"
                    required
                    hint="無料の場合は 0 と入力"
                  >
                    <div className="relative">
                      <JapaneseYen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]" />
                      <Input
                        type="number"
                        min={0}
                        aria-invalid={!!errors.price}
                        {...register("price")}
                        className={inputWithIconCls}
                      />
                    </div>
                    <FieldError message={errors.price?.message} />
                  </FieldWrapper>
                </div>

                <FieldWrapper
                  label="参加費についての補足"
                  optional
                  hint="例：各自のお茶代のみ、ランチ代は別途、材料費込み"
                >
                  <Input
                    placeholder="例：各自のお食事代のみ"
                    {...register("price_note")}
                    className={inputCls}
                  />
                </FieldWrapper>

                {/* Payment methods selector — multi-select */}
                {Number(watchedPrice) > 0 && (
                  <PaymentMethodsField
                    methods={watchedValues.payment_methods ?? (watchedPaymentMethod ? [watchedPaymentMethod] : ['stripe'])}
                    onChange={(methods) => {
                      setValue("payment_methods", methods, { shouldDirty: true });
                      if (methods.length > 0) setValue("payment_method", methods[0], { shouldDirty: true });
                    }}
                    register={register}
                    values={watchedValues}
                    inputCls={inputCls}
                    inputWithIconCls={inputWithIconCls}
                  />
                )}
              </div>
            </FormSection>

            {/* Category & Tags */}
            <FormSection title="カテゴリ・タグ">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#1A1A1A]">
                    カテゴリ
                    <span className="ml-2 text-xs font-normal text-[#999999]">任意</span>
                  </label>
                  <p className="mb-3 text-xs text-[#999999]">
                    AI領域もライフスタイル系も対応。設定すると関連イベント推薦・参加者分析の精度が上がります
                  </p>
                  <CategoryPicker value={categoryId} onChange={setCategoryId} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#1A1A1A]">
                    タグ
                    <span className="ml-2 text-xs font-normal text-[#999999]">複数選択可</span>
                  </label>
                  <p className="mb-3 text-xs text-[#999999]">
                    形式・対象などのタグで検索ヒット率アップ
                  </p>
                  <TagPicker selectedIds={tagIds} onChange={setTagIds} collapsible />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#1A1A1A]">
                    事前アンケート
                    <span className="ml-2 text-xs font-normal text-[#999999]">任意</span>
                  </label>
                  <p className="mb-3 text-xs text-[#999999]">
                    申込時に参加者へ任意質問を聞けます（最大3問・全て任意回答）
                  </p>
                  <CustomQuestionsEditor
                    value={customQuestions}
                    onChange={setCustomQuestions}
                  />
                </div>
              </div>
            </FormSection>

            {/* Limited access */}
            <FormSection title="限定公開設定">
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E5E5E5] p-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      {...register("is_limited")}
                      className="h-5 w-5 rounded border-[#E5E5E5] text-[#1A1A1A] focus:ring-[#1A1A1A]/20"
                    />
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#1A1A1A]" />
                      <span className="text-sm font-medium text-[#1A1A1A]">限定公開にする</span>
                    </div>
                  </label>
                  <p className="mt-1.5 ml-8 text-xs text-[#999999]">
                    イベント内容の閲覧に合言葉が必要になります
                  </p>
                </div>
                {watchedIsLimited && (
                  <div className="ml-4">
                    <FieldWrapper label="合言葉" hint="参加者に共有する合言葉を設定してください">
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A1A1A]" />
                        <Input
                          placeholder="例：sakura2024"
                          {...register("limited_passcode")}
                          className={inputWithIconCls}
                        />
                      </div>
                    </FieldWrapper>
                  </div>
                )}
              </div>
            </FormSection>

            {/* Image */}
            <FormSection title="画像">
              <FieldWrapper
                label="イベント画像"
                optional
                hint="イベントのカバー画像をアップロードできます"
              >
                <ImageUpload
                  value={watch("image_url")}
                  onChange={(url) => setValue("image_url", url, { shouldDirty: true })}
                />
                <FieldError message={errors.image_url?.message} />
              </FieldWrapper>
            </FormSection>

            {/* Teacher info */}
            <FormSection title="先生・主催者プロフィール（任意）">
              <div className="space-y-5">
                <FieldWrapper label="お名前">
                  <Input
                    placeholder="例：田中 さくら"
                    {...register("teacher_name")}
                    className={inputCls}
                  />
                </FieldWrapper>
                <FieldWrapper label="一言プロフィール">
                  <Textarea
                    placeholder="例：ヨガインストラクター歴10年。笑顔と丁寧な指導が信条です。"
                    rows={3}
                    {...register("teacher_bio")}
                    className="rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20 bg-[#FAFAFA] resize-none"
                  />
                </FieldWrapper>
              </div>
            </FormSection>

            {/* Co-admin management (creator only) */}
            <CoAdminSection eventId={eventId} isCreator={isCreator} />

            {/* Server error */}
            {serverError && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-sm text-red-500">{serverError}</p>
              </div>
            )}

            {/* Save buttons */}
            <div className="space-y-2">
              <Button
                type="submit"
                disabled={isSubmitting || savingDraft || !isDirty}
                className="h-12 w-full rounded-xl bg-[#1A1A1A] text-base font-bold text-white hover:bg-[#111111] disabled:opacity-60 gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "変更を保存する"
                )}
              </Button>
              <Button
                type="button"
                onClick={saveDraft}
                disabled={isSubmitting || savingDraft}
                variant="outline"
                className="h-11 w-full rounded-xl border-[#E5E5E5] bg-white text-sm font-medium text-[#1A1A1A] hover:bg-[#F7F7F7] disabled:opacity-60"
              >
                {savingDraft ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "下書きとして保存（非公開）"
                )}
              </Button>
            </div>

            {/* Mobile preview link */}
            <a
              href={`/events/${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] bg-white text-sm text-[#999999] hover:border-[#1A1A1A]/30 hover:text-[#1A1A1A] transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              公開ページをプレビュー
            </a>

            {/* Danger zone (creator only) */}
            {isCreator && <div className="rounded-2xl border border-red-100 bg-red-50/50 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-red-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <h3 className="text-sm font-bold text-red-500">
                  危険ゾーン
                </h3>
              </div>
              <div className="p-5">
                <p className="mb-4 text-sm text-red-400/80 leading-relaxed">
                  イベントを削除すると元に戻すことはできません。
                  すべての申し込みデータも失われます。
                </p>
                <Button
                  type="button"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-xl h-9"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4" />
                  このイベントを削除する
                </Button>
              </div>
            </div>}
          </form>
        </div>
      </main>

      {/* Promotion confirmation dialog */}
      <Dialog
        open={!!promotionPreview}
        onOpenChange={(open) => {
          if (!open) cancelPromotion();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
                <Users className="h-4 w-4 text-emerald-700" />
              </div>
              キャンセル待ちの自動繰り上げ
            </DialogTitle>
            <DialogDescription className="leading-relaxed pt-2">
              定員を{" "}
              <span className="font-bold text-[#1A1A1A]">
                {originalCapacity ?? "?"} → {promotionPreview && originalCapacity !== null
                  ? originalCapacity + promotionPreview.increase
                  : "?"} 名
              </span>{" "}
              に増やします。
              <br />
              現在のキャンセル待ち <span className="font-bold text-[#1A1A1A]">{waitlistCount} 名</span>{" "}
              のうち、申込が古い順に{" "}
              <span className="font-bold text-emerald-700">
                {promotionPreview?.willPromote ?? 0} 名
              </span>{" "}
              を自動で参加確定にし、Zoom情報・支払い案内入りのメールを送信します。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={cancelPromotion}
              disabled={promotionSubmitting}
              className="rounded-xl"
            >
              キャンセル
            </Button>
            <Button
              onClick={confirmPromotion}
              disabled={promotionSubmitting}
              className="gap-2 rounded-xl bg-[#1A1A1A] hover:bg-[#111111] text-white"
            >
              {promotionSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  実行中...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  繰り上げて通知する
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              イベントを削除しますか？
            </DialogTitle>
            <DialogDescription>
              この操作は取り消せません。イベントと関連する申し込みデータがすべて削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2 rounded-xl bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  削除する
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
