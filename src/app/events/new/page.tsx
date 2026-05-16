"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  MapPin,
  Users,
  JapaneseYen,
  Loader2,
  Sparkles,
  Eye,
  ChevronDown,
  ChevronUp,
  Check,
  ChevronRight,
  LogIn,
  Lock,
  Shield,
  Video,
  CreditCard,
  Banknote,
  FileText,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TEMPLATES, type EventTemplate } from "@/lib/templates";
import { useAuth } from "@/components/auth-provider";
import { LoginDialog } from "@/components/login-dialog";
import { ImageUpload } from "@/components/image-upload";
import { PaymentMethodsField, type PaymentMethod } from "@/components/payment-methods-field";
import { CategoryPicker } from "@/components/category-picker";
import { TagPicker } from "@/components/tag-picker";
import { AITitleSuggestions } from "@/components/ai-title-suggestions";
import { CustomQuestionsEditor } from "@/components/custom-questions-editor";
import type { CustomQuestion } from "@/lib/custom-questions";

// ─── Schema ────────────────────────────────────────────────────────────────

const createEventBaseSchema = z.object({
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
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1, "1名以上にしてください"),
  capacity_physical: z.string().optional(),
  capacity_online: z.string().optional(),
  price: z
    .string()
    .min(1, "料金を入力してください")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "0円以上にしてください"),
  image_url: z.union([z.string().url("有効なURLを入力してください"), z.literal("")]).optional(),
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

const createEventSchema = createEventBaseSchema.refine(
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
    // hybrid のときはリアル枠 / オンライン枠 ともに 1以上必須
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

type CreateEventFormValues = z.infer<typeof createEventBaseSchema>;

interface CreateEventPayload {
  title: string;
  description: string;
  datetime: string;
  booking_deadline?: string;
  location?: string;
  location_type: string;
  online_url?: string;
  zoom_meeting_id?: string;
  zoom_passcode?: string;
  location_url?: string;
  capacity: number;
  capacity_physical?: number | null;
  capacity_online?: number | null;
  price: number;
  image_url?: string;
  price_note?: string;
  payment_method?: string;
  payment_methods?: string[];
  payment_link?: string;
  payment_info?: string;
  payment_deadline_days?: number;
  bank_name?: string;
  bank_branch?: string;
  bank_account_type?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  bank_note?: string;
  is_limited?: boolean;
  limited_passcode?: string;
  teacher_name?: string;
  teacher_bio?: string;
  category_id?: number | null;
  tag_ids?: number[];
  custom_questions?: CustomQuestion[];
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "基本情報", shortLabel: "基本" },
  { id: 2, label: "日時・場所", shortLabel: "日時" },
  { id: 3, label: "詳細設定", shortLabel: "詳細" },
] as const;

type StepId = 1 | 2 | 3;

// ─── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: StepId;
  onStepClick: (step: StepId) => void;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        return (
          <div key={step.id} className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all sm:px-3 ${
                isCurrent
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : isCompleted
                  ? "bg-[#404040]/10 text-[#404040] hover:bg-[#404040]/20"
                  : "text-[#999999]"
              }`}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  isCurrent ? "bg-white/20 text-white" : "bg-[#E5E5E5] text-[#999999]"
                }`}>
                  {step.id}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{step.shortLabel}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-[#E5E5E5]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Template picker sub-component ───────────────────────────────────────────

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: EventTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all hover:shadow-sm ${
        isSelected
          ? "border-[#1A1A1A] bg-[#F7F7F7] shadow-sm"
          : "border-[#E5E5E5] bg-white hover:border-[#1A1A1A]/40"
      }`}
    >
      {isSelected && (
        <div className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#1A1A1A]">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}
      {/* Icon + emoji */}
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{template.icon}</span>
        <Badge
          className="text-xs bg-[#F2F2F2] text-[#1A1A1A] border border-[#1A1A1A]/20"
        >
          {template.category}
        </Badge>
      </div>
      <p className="text-xs font-semibold leading-snug text-[#1A1A1A] line-clamp-2">
        {template.title.replace(/^[^\s]+\s/, "")}
      </p>
      <p className="text-xs text-[#999999]">
        ¥{template.defaultPrice.toLocaleString("ja-JP")} · {template.defaultCapacity}名
      </p>
    </button>
  );
}

function TemplatePicker({ onApply }: { onApply: (template: EventTemplate) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (template: EventTemplate) => {
    setSelectedId(template.id);
    onApply(template);
    // Auto-close after selection
    setTimeout(() => setExpanded(false), 400);
  };

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedId);

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-dashed border-[#1A1A1A]/40 bg-gradient-to-r from-[#F7F7F7] to-[#F7F7F7]">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1A1A1A]/10">
          <Sparkles className="h-4 w-4 text-[#1A1A1A]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#1A1A1A]">
            テンプレートから始める
          </p>
          <p className="mt-0.5 text-xs text-[#999999]">
            {selectedTemplate
              ? `「${selectedTemplate.category}」を適用中`
              : "ワンタップで入力を時短"}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[#999999]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#999999]" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[#E5E5E5]/60 px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedId === template.id}
                onSelect={() => handleSelect(template)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-[#DC2626]">
      <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-[#DC2626] text-center text-[8px] leading-3">!</span>
      {message}
    </p>
  );
}

function FormSection({
  title,
  children,
  step,
}: {
  title: string;
  children: React.ReactNode;
  step?: number;
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E5E5E5]">
      <div className="mb-5 flex items-center gap-2">
        {step !== undefined && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-[10px] font-bold text-white">
            {step}
          </span>
        )}
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#999999]">
          {title}
        </h2>
      </div>
      {children}
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
  hint?: React.ReactNode;
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
      {hint && <p className="text-xs text-[#999999]">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Preview ────────────────────────────────────────────────────────────────

function EventPreview({ values }: { values: Partial<CreateEventFormValues> }) {
  const price = Number(values.price);
  const capacity = Number(values.capacity);

  const formatPrice = () => {
    if (isNaN(price)) return "—";
    return price === 0 ? "無料" : `¥${price.toLocaleString("ja-JP")}`;
  };

  const formatDatetime = () => {
    if (!values.datetime) return "—";
    try {
      return new Date(values.datetime).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return values.datetime;
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E5E5E5]">
      {/* Hero */}
      <div className="relative flex min-h-[120px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#F2F2F2] to-[#E0E0E0]">
        {values.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={values.image_url}
            alt="プレビュー"
            className="w-full object-contain"
          />
        ) : (
          <div className="py-8 text-center">
            <span className="text-5xl">🎉</span>
            <p className="mt-2 text-xs text-[#999999]">画像なし</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {values.title && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="line-clamp-2 text-sm font-bold leading-snug text-white drop-shadow-sm">
              {values.title}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        {!values.title && (
          <h3 className="font-bold leading-snug text-[#999999]">
            イベントタイトル
          </h3>
        )}

        {values.description && (
          <p className="line-clamp-3 whitespace-pre-line text-xs text-[#999999]">
            {values.description}
          </p>
        )}

        <Separator />

        <div className="space-y-2 text-xs text-[#999999]">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
            <span>{formatDatetime()}</span>
          </div>
          {(values.location_type === "online" || values.location_type === "hybrid") && (
            <div className="flex items-center gap-2">
              <Video className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
              <span>オンライン</span>
            </div>
          )}
          {(values.location_type !== "online") && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
              <span>{values.location || "場所"}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
            {values.location_type === "hybrid" ? (
              <span>
                定員 リアル {Number(values.capacity_physical) || 0} 名 / オンライン {Number(values.capacity_online) || 0} 名
              </span>
            ) : (
              <span>定員 {isNaN(capacity) ? "—" : capacity} 名</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <JapaneseYen className="h-3.5 w-3.5 shrink-0 text-[#1A1A1A]" />
            <span className={`font-bold ${price === 0 && !isNaN(price) ? "text-[#404040]" : "text-[#1A1A1A]"}`}>
              {formatPrice()}
            </span>
          </div>
        </div>

        {values.teacher_name && (
          <>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-base font-bold text-[#1A1A1A]">
                {values.teacher_name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A]">
                  {values.teacher_name}
                </p>
                {values.teacher_bio && (
                  <p className="line-clamp-2 text-xs text-[#999999]">
                    {values.teacher_bio}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function NewEventPage() {
  return (
    <Suspense>
      <NewEventPageInner />
    </Suspense>
  );
}

function NewEventPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      capacity: "10",
      price: "0",
      location_type: "physical",
      payment_method: "stripe",
      payment_methods: ["stripe"],
      bank_account_type: "普通",
    },
  });

  const [savingDraft, setSavingDraft] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);

  const watchedValues = watch();

  // Duplicate: fetch source event and prefill form
  const duplicateId = searchParams.get("duplicate");
  useEffect(() => {
    if (!duplicateId) return;
    (async () => {
      try {
        const res = await fetch(`/api/events/${duplicateId}`);
        if (!res.ok) return;
        const json = await res.json();
        const ev = json.event;
        if (!ev) return;
        reset({
          title: `【コピー】${ev.title}`,
          description: ev.description ?? "",
          datetime: "", // user should set a new date
          location: ev.location ?? "",
          location_type: ev.location_type ?? "physical",
          online_url: ev.online_url ?? "",
          zoom_meeting_id: ev.zoom_meeting_id ?? "",
          zoom_passcode: ev.zoom_passcode ?? "",
          location_url: ev.location_url ?? "",
          capacity: String(ev.capacity ?? 10),
          price: String(ev.price ?? 0),
          image_url: ev.image_url ?? "",
          price_note: ev.price_note ?? "",
          payment_method: ev.payment_method ?? "stripe",
          payment_methods: (ev.payment_methods as PaymentMethod[] | null) ?? (ev.payment_method ? [ev.payment_method as PaymentMethod] : ["stripe"]),
          payment_link: ev.payment_link ?? "",
          payment_info: ev.payment_info ?? "",
          payment_deadline_days: ev.payment_deadline_days ? String(ev.payment_deadline_days) : "",
          bank_name: ev.bank_name ?? "",
          bank_branch: ev.bank_branch ?? "",
          bank_account_type: ev.bank_account_type ?? "普通",
          bank_account_number: ev.bank_account_number ?? "",
          bank_account_holder: ev.bank_account_holder ?? "",
          bank_note: ev.bank_note ?? "",
          is_limited: ev.is_limited ?? false,
          limited_passcode: ev.limited_passcode ?? "",
          teacher_name: ev.teacher_name ?? "",
          teacher_bio: ev.teacher_bio ?? "",
        });
      } catch {
        // silently ignore fetch errors
      }
    })();
  }, [duplicateId, reset]);

  const applyTemplate = (template: EventTemplate) => {
    reset({
      ...watchedValues,
      title: template.title,
      description: template.description,
      capacity: String(template.defaultCapacity),
      price: String(template.defaultPrice),
    });
  };

  const saveDraft = async () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    setServerError(null);
    // Drafts only require a title — fail early with an inline error if missing
    const ok = await trigger("title");
    if (!ok) {
      setError("title", { message: "下書き保存にはタイトルが必要です" });
      return;
    }
    const data = getValues();
    setSavingDraft(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          save_as_draft: true,
          title: data.title,
          description: data.description || undefined,
          datetime: data.datetime ? new Date(data.datetime).toISOString() : undefined,
          booking_deadline: data.booking_deadline ? new Date(data.booking_deadline).toISOString() : undefined,
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
          custom_questions: customQuestions.length > 0 ? customQuestions : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setShowLoginDialog(true);
          return;
        }
        setServerError(json.error ?? "下書きの保存に失敗しました");
        return;
      }
      router.push(`/events/${json.event.id}/edit?draft_saved=1`);
    } catch {
      setServerError("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setSavingDraft(false);
    }
  };

  const onSubmit = async (data: CreateEventFormValues) => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    setServerError(null);

    const payload: CreateEventPayload = {
      title: data.title,
      description: data.description,
      datetime: new Date(data.datetime).toISOString(),
      booking_deadline: data.booking_deadline ? new Date(data.booking_deadline).toISOString() : undefined,
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
          : undefined,
      capacity_online:
        data.location_type === "hybrid"
          ? Number(data.capacity_online)
          : undefined,
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
      category_id: categoryId ?? undefined,
      tag_ids: tagIds.length > 0 ? tagIds : undefined,
      custom_questions: customQuestions.length > 0 ? customQuestions : undefined,
    };

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setShowLoginDialog(true);
          return;
        }
        setServerError(json.error ?? "イベントの作成に失敗しました");
        return;
      }

      router.push(`/events/${json.event.id}?showLineSchedule=true`);
    } catch {
      setServerError(
        "ネットワークエラーが発生しました。もう一度お試しください。"
      );
    }
  };

  const inputCls =
    "h-11 rounded-xl border-[#E5E5E5] transition-colors focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20";
  const inputWithIconCls = `${inputCls} pl-9`;

  return (
    <main className="min-h-dvh bg-[#FAFAFA]">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[#E5E5E5] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-[#1A1A1A]">
              イベントを作成
            </h1>
            <div className="hidden sm:block">
              <StepIndicator
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && !user && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowLoginDialog(true)}
                className="gap-1.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#111111] shadow-sm"
              >
                <LogIn className="h-3.5 w-3.5" />
                ログイン
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((v) => !v)}
              className="gap-1.5 text-[#1A1A1A] hover:bg-[#F2F2F2] hover:text-[#1A1A1A] lg:hidden"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? "フォームに戻る" : "プレビュー"}
            </Button>
          </div>
        </div>

        {/* Mobile step indicator */}
        <div className="border-t border-[#E5E5E5]/60 px-4 py-2 sm:hidden">
          <StepIndicator
            currentStep={currentStep}
            onStepClick={setCurrentStep}
          />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Login prompt banner */}
        {!isLoading && !user && (
          <button
            type="button"
            onClick={() => setShowLoginDialog(true)}
            className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-4 text-left shadow-sm transition-all hover:border-[#1A1A1A]/30 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A1A1A]">
              <LogIn className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1A1A1A]">
                ログインしてイベントを作成
              </p>
              <p className="mt-0.5 text-xs text-[#999999]">
                LINEまたはメールアドレスでログインすると、イベントの作成・管理ができます
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#999999]" />
          </button>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* ── Form column ────────────────────────────────── */}
          <div className={showPreview ? "hidden lg:block" : ""}>
            {/* Template picker */}
            <TemplatePicker onApply={applyTemplate} />

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5"
            >
              {/* Step 1: Basic info */}
              <FormSection title="基本情報" step={1}>
                <div className="space-y-5" onClick={() => setCurrentStep(1)}>
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
                      className="rounded-xl border-[#E5E5E5] transition-colors focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
                    />
                    <FieldError message={errors.description?.message} />
                    <AITitleSuggestions
                      description={watchedValues.description ?? ""}
                      category={null}
                      onApply={(t) =>
                        setValue("title", t, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    />
                  </FieldWrapper>
                </div>
              </FormSection>

              {/* Step 2: Date / Location */}
              <FormSection title="日時・場所" step={2}>
                <div className="space-y-5" onClick={() => setCurrentStep(2)}>
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
                        const isSelected = watchedValues.location_type === opt.value;
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

                  {(watchedValues.location_type === "physical" || watchedValues.location_type === "hybrid") && (
                    <FieldWrapper
                      label="場所・会場"
                      required
                    >
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

                  {(watchedValues.location_type === "online" || watchedValues.location_type === "hybrid") && (
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

                  {(watchedValues.location_type === "physical" || watchedValues.location_type === "hybrid") && (
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

              {/* Step 3: Capacity / Price / Image / Teacher */}
              <FormSection title="詳細設定" step={3}>
                <div className="space-y-5" onClick={() => setCurrentStep(3)}>
                  {/* Capacity / Price */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    {watchedValues.location_type === "hybrid" ? (
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
                          合計定員: {(Number(watchedValues.capacity_physical) || 0) + (Number(watchedValues.capacity_online) || 0)} 名
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
                      hint={<>無料の場合は 0 と入力。有料にするには<a href="/settings/stripe" target="_blank" rel="noopener noreferrer" className="text-[#635BFF] underline underline-offset-2 hover:no-underline">Stripe連携</a>が必要です</>}
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

                  {/* Price note */}
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

                  <Separator />

                  {/* Category & Tags */}
                  <FieldWrapper
                    label="カテゴリ"
                    optional
                    hint="近いジャンルを1つ選ぶと検索・レコメンド精度が上がります"
                  >
                    <CategoryPicker
                      value={categoryId}
                      onChange={setCategoryId}
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    label="タグ（複数選択可）"
                    optional
                    hint="形式・対象などのタグで検索ヒット率アップ"
                  >
                    <TagPicker
                      selectedIds={tagIds}
                      onChange={setTagIds}
                      collapsible
                    />
                  </FieldWrapper>

                  <FieldWrapper
                    label="事前アンケート"
                    optional
                    hint="申込時に参加者へ任意質問を聞けます（最大3問・全て任意回答）"
                  >
                    <CustomQuestionsEditor
                      value={customQuestions}
                      onChange={setCustomQuestions}
                    />
                  </FieldWrapper>

                  {/* Payment methods selector (only when price > 0) — multi-select */}
                  {Number(watchedValues.price) > 0 && (
                    <PaymentMethodsField
                      methods={watchedValues.payment_methods ?? (watchedValues.payment_method ? [watchedValues.payment_method as 'stripe'|'bank'|'onsite'|'custom'] : ['stripe'])}
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

                  <Separator />

                  {/* Limited event */}
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
                    {watchedValues.is_limited && (
                      <div className="mt-3 ml-8">
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

                  <Separator />

                  {/* Image */}
                  <FieldWrapper
                    label="イベント画像"
                    optional
                    hint="イベントのカバー画像をアップロードできます"
                  >
                    <ImageUpload
                      value={watchedValues.image_url}
                      onChange={(url) => setValue("image_url", url, { shouldDirty: true })}
                    />
                    <FieldError message={errors.image_url?.message} />
                  </FieldWrapper>

                  <Separator />

                  {/* Teacher */}
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <p className="text-sm font-medium text-[#1A1A1A]">先生・主催者プロフィール</p>
                      <Badge variant="secondary" className="text-xs">
                        任意
                      </Badge>
                    </div>
                    <div className="space-y-4">
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
                          className="rounded-xl border-[#E5E5E5] transition-colors focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
                        />
                      </FieldWrapper>
                    </div>
                  </div>
                </div>
              </FormSection>

              {/* Server error */}
              {serverError && (
                <div className="flex items-start gap-3 rounded-xl bg-[#DC2626]/8 border border-[#DC2626]/20 px-4 py-3">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#DC2626] text-[8px] font-bold text-[#DC2626]">!</span>
                  <p className="text-sm text-[#DC2626]">{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={isSubmitting || savingDraft}
                  className="h-12 w-full rounded-xl bg-[#1A1A1A] text-base font-bold text-white shadow-sm hover:bg-[#111111] disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      作成中...
                    </>
                  ) : (
                    "イベントページを作成する"
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
                    "下書きとして保存（あとで編集）"
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* ── Preview column ─────────────────────────────── */}
          <div
            className={`${showPreview ? "" : "hidden lg:block"} lg:sticky lg:top-[88px] lg:self-start`}
          >
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-[#999999]">
              <Eye className="h-4 w-4" />
              プレビュー
            </p>
            <EventPreview values={watchedValues} />

            {/* Step progress on desktop */}
            <div className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#E5E5E5]">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#999999]">
                入力ステップ
              </p>
              <div className="space-y-2">
                {STEPS.map((step) => {
                  const isActive = step.id === currentStep;
                  const isDone = step.id < currentStep;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-[#F7F7F7] text-[#1A1A1A] font-medium"
                          : isDone
                          ? "text-[#404040]"
                          : "text-[#999999]"
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-[#1A1A1A] text-white"
                          : isDone
                          ? "bg-[#404040]/10 text-[#404040]"
                          : "bg-[#EEEEEE] text-[#999999]"
                      }`}>
                        {isDone ? <Check className="h-3 w-3" /> : step.id}
                      </span>
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} defaultMode="signup" />
    </main>
  );
}
