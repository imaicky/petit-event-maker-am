import { z } from "zod";

// ─── 共通スキーマ ─────────────────────────────────────
// events.custom_questions: 主催者が定義する任意回答の質問配列（最大3問）
// bookings.custom_answers : 参加者が申込時に返した回答 (questionId -> answer)

export const QUESTION_TYPES = ["select", "text"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const MAX_QUESTIONS = 3;
export const MAX_OPTIONS = 8;
export const MAX_LABEL_LEN = 60;
export const MAX_OPTION_LEN = 40;
export const MAX_ANSWER_LEN = 500;

export const customQuestionSchema = z
  .object({
    id: z.string().regex(/^q[a-z0-9_-]{1,40}$/i, "id 形式が不正です"),
    label: z
      .string()
      .min(1, "質問文を入力してください")
      .max(MAX_LABEL_LEN, `質問文は${MAX_LABEL_LEN}文字以内`),
    type: z.enum(QUESTION_TYPES),
    options: z
      .array(z.string().min(1).max(MAX_OPTION_LEN))
      .max(MAX_OPTIONS)
      .optional(),
  })
  .refine(
    (q) =>
      q.type !== "select" ||
      (Array.isArray(q.options) && q.options.length >= 2),
    {
      message: "選択肢タイプは2件以上の選択肢が必要です",
      path: ["options"],
    }
  );

export type CustomQuestion = z.infer<typeof customQuestionSchema>;

export const customQuestionsSchema = z
  .array(customQuestionSchema)
  .max(MAX_QUESTIONS, `質問は最大${MAX_QUESTIONS}個まで`)
  .superRefine((qs, ctx) => {
    const ids = new Set<string>();
    qs.forEach((q, idx) => {
      if (ids.has(q.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [idx, "id"],
          message: "id が重複しています",
        });
      }
      ids.add(q.id);
    });
  });

// 回答は {questionId: string} — 未回答は単に欠落、空文字も「未回答」扱いに正規化
export const customAnswersSchema = z
  .record(z.string(), z.string().max(MAX_ANSWER_LEN))
  .default({});

export type CustomAnswers = z.infer<typeof customAnswersSchema>;

// ─── ヘルパー ─────────────────────────────────────────

/** DB の `custom_questions` (JSONB) を安全に CustomQuestion[] に変換 */
export function parseCustomQuestions(raw: unknown): CustomQuestion[] {
  const parsed = customQuestionsSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data;
}

/**
 * 参加者から受け取った回答を、現在の質問定義に対して正規化:
 * - 質問定義に存在しない id は破棄
 * - select 型の値が options に無い場合は破棄
 * - 空文字・前後空白のみは破棄（未回答扱い）
 * - 長さ制限を超えた値は破棄
 */
export function sanitizeAnswers(
  questions: CustomQuestion[],
  raw: unknown
): CustomAnswers {
  const parsed = customAnswersSchema.safeParse(raw ?? {});
  if (!parsed.success) return {};
  const answers = parsed.data;
  const out: CustomAnswers = {};
  for (const q of questions) {
    const v = answers[q.id];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    if (trimmed.length > MAX_ANSWER_LEN) continue;
    if (q.type === "select") {
      if (!q.options?.includes(trimmed)) continue;
    }
    out[q.id] = trimmed;
  }
  return out;
}

/** 質問ID用のランダムslug風id生成 (UI で新規追加時に使う) */
export function generateQuestionId(): string {
  // crypto.randomUUID は edge でも利用可、衝突しない
  return `q${Math.random().toString(36).slice(2, 10)}`;
}

// ─── テンプレート（イベント編集画面の「ワンクリック追加」用） ─

export type QuestionTemplate = {
  key: string;
  emoji: string;
  label: string;
  question: Omit<CustomQuestion, "id">;
};

export const QUESTION_TEMPLATES: readonly QuestionTemplate[] = [
  {
    key: "bento",
    emoji: "🍱",
    label: "お弁当の希望",
    question: {
      label: "お弁当の希望を教えてください",
      type: "select",
      options: ["肉", "魚", "ベジタリアン", "ヴィーガン", "不要"],
    },
  },
  {
    key: "after_party",
    emoji: "🍻",
    label: "懇親会の参加",
    question: {
      label: "懇親会に参加されますか？",
      type: "select",
      options: ["参加する", "参加しない", "検討中"],
    },
  },
  {
    key: "allergy",
    emoji: "⚠️",
    label: "アレルギー",
    question: {
      label: "食物アレルギーがあれば教えてください",
      type: "text",
    },
  },
  {
    key: "bring",
    emoji: "💼",
    label: "持参物",
    question: {
      label: "当日の持参物について",
      type: "select",
      options: ["PC持参", "手ぶら参加", "未定"],
    },
  },
] as const;
