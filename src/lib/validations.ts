import { z } from 'zod'

// ─── Event ───────────────────────────────────────────────────

// Event creation / update schema (API-facing, without slug)
export const eventSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'タイトルは必須です' })
    .max(100, { message: 'タイトルは100文字以内で入力してください' })
    .trim(),
  description: z
    .string()
    .max(2000, { message: '説明は2000文字以内で入力してください' })
    .optional()
    .nullable(),
  datetime: z
    .string()
    .min(1, { message: '開催日時は必須です' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: '有効な日時を入力してください',
    }),
  location: z
    .string()
    .max(200, { message: '場所は200文字以内で入力してください' })
    .optional()
    .nullable(),
  capacity: z
    .number({ message: '定員は数値で入力してください' })
    .int({ message: '定員は整数で入力してください' })
    .min(1, { message: '定員は1人以上を指定してください' })
    .max(100000, { message: '定員は100,000人以内で指定してください' })
    .optional()
    .nullable(),
  price: z
    .number({ message: '参加費は数値で入力してください' })
    .int({ message: '参加費は整数で入力してください' })
    .min(0, { message: '参加費は0円以上を指定してください' })
    .max(1000000, { message: '参加費は1,000,000円以内で指定してください' })
    .optional()
    .nullable(),
  image_url: z
    .string()
    .url({ message: '有効なURLを入力してください' })
    .optional()
    .nullable(),
  is_published: z.boolean().optional().default(true),
  slug: z
    .string()
    .min(1, { message: 'スラッグは必須です' })
    .max(100, { message: 'スラッグは100文字以内で入力してください' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'スラッグは小文字英数字とハイフンのみ使用できます',
    })
    .optional(),
  category: z.string().max(50).optional().nullable(),
  teacher_name: z.string().max(100).optional().nullable(),
  teacher_bio: z.string().max(500).optional().nullable(),
})

export type EventFormData = z.infer<typeof eventSchema>

// ─── Booking ─────────────────────────────────────────────────

// Booking form schema (event_id is supplied via URL param in API routes)
export const bookingSchema = z.object({
  guest_name: z
    .string()
    .min(1, { message: 'お名前は必須です' })
    .max(100, { message: 'お名前は100文字以内で入力してください' })
    .trim(),
  guest_email: z
    .string()
    .email({ message: '有効なメールアドレスを入力してください' })
    .trim(),
  guest_phone: z
    .string()
    .regex(/^[\d\-+() ]+$/, { message: '有効な電話番号を入力してください' })
    .max(20, { message: '電話番号は20文字以内で入力してください' })
    .optional()
    .nullable(),
})

export type BookingFormData = z.infer<typeof bookingSchema>

// ─── Profile ─────────────────────────────────────────────────

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'ユーザー名は3文字以上で入力してください' })
    .max(30, { message: 'ユーザー名は30文字以内で入力してください' })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: 'ユーザー名は英数字とアンダースコアのみ使用できます',
    })
    .trim(),
  display_name: z
    .string()
    .max(50, { message: '表示名は50文字以内で入力してください' })
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(500, { message: '自己紹介は500文字以内で入力してください' })
    .optional()
    .nullable(),
  avatar_url: z
    .string()
    .url({ message: '有効なURLを入力してください' })
    .optional()
    .nullable(),
  sns_links: z
    .object({
      twitter: z
        .string()
        .url({ message: '有効なURLを入力してください' })
        .optional(),
      instagram: z
        .string()
        .url({ message: '有効なURLを入力してください' })
        .optional(),
      facebook: z
        .string()
        .url({ message: '有効なURLを入力してください' })
        .optional(),
      website: z
        .string()
        .url({ message: '有効なURLを入力してください' })
        .optional(),
    })
    .optional()
    .nullable(),
  is_teacher: z.boolean().optional(),
})

export type ProfileFormData = z.infer<typeof profileSchema>

// ─── Review ──────────────────────────────────────────────────

export const reviewSchema = z.object({
  reviewer_name: z
    .string()
    .min(1, { message: 'お名前は必須です' })
    .max(50, { message: 'お名前は50文字以内で入力してください' }),
  rating: z
    .number({ message: '評価を選択してください' })
    .int()
    .min(1, { message: '評価は1〜5で選択してください' })
    .max(5, { message: '評価は1〜5で選択してください' }),
  comment: z
    .string()
    .min(1, { message: 'コメントを入力してください' })
    .max(1000, { message: 'コメントは1000文字以内で入力してください' }),
})

export type ReviewFormData = z.infer<typeof reviewSchema>
