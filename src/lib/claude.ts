import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// ─── Singleton client ──────────────────────────────────────────────
let _client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment variables."
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export function isClaudeAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ─── Models / config ───────────────────────────────────────────────
// Haiku 4.5: $1/1M input, $5/1M output — cost-efficient default for
// short structured-output tasks. Use Sonnet/Opus only when quality matters.
export const DEFAULT_MODEL = "claude-haiku-4-5" as const;

const MAX_TOKENS_DEFAULT = 2048;

// ─── Syllabus suggestions ──────────────────────────────────────────

export type AudienceInput = {
  participantCount: number;
  topCategories: Array<{ name: string; count: number }>;
  aiLevelDistribution: Record<string, number>;
  organizerPastCategories: string[];
  currentEventTitle: string;
  currentEventCategory: string | null;
};

const AiSuggestionSchema = z.object({
  title: z.string().describe("魅力的なイベントタイトル（30〜60文字推奨）"),
  rationale: z.string().describe("提案理由（80〜150文字、データ根拠を含む）"),
  category: z
    .string()
    .nullable()
    .describe("該当するカテゴリ名（無ければnull）"),
  level: z
    .string()
    .describe("対象レベル（入門/初級/中級/上級/エキスパート）"),
  format: z
    .string()
    .describe("推奨形式（ハンズオン/講義/座談会/ワークショップ等）"),
  estimated_duration_min: z
    .number()
    .int()
    .describe("推奨時間（分単位、60〜180）"),
});

const SyllabusResponseSchema = z.object({
  suggestions: z
    .array(AiSuggestionSchema)
    .describe("3つの次回イベント提案"),
});

export type AiSyllabusSuggestion = z.infer<typeof AiSuggestionSchema>;

const SYSTEM_PROMPT = `あなたはイベント主催者のシラバス設計を支援する戦略AIアドバイザーです。
あなたの役割は、過去の参加者データから次回開催すると効果的なイベントを3つ提案することです。

## 提案の原則
1. **参加者起点**: 興味分布と知識レベルに合致していること
2. **差別化**: 主催者の過去開催と被らないテーマであること
3. **行動性**: 参加者が「これに参加したい」と即決できる具体的なタイトル
4. **根拠**: 「なぜこれがおすすめか」がデータから明確に説明できること
5. **レベル整合**: AIレベル分布の最頻値に対象レベルを揃える

## 領域横断
AI領域に限らず汎用的に提案してください。AI関連カテゴリ（LLM活用/画像生成/プロンプトエンジニアリング等）も、ライフスタイル系（ヨガ/ハンドメイド/フラワー等）も、データに応じて適切に扱う。

## トーン
- タイトルは具体的かつ短い動詞型（例: "プロンプト改善で成果を倍に"）
- 抽象的な美辞麗句（次世代/革新/AI時代の…）は禁止
- 参加者目線の便益を強調`;

/**
 * Generate 3 next-event suggestions from audience data.
 * Uses Claude Haiku 4.5 with structured outputs (Zod) and prompt caching.
 */
export async function generateSyllabusWithClaude(
  input: AudienceInput
): Promise<AiSyllabusSuggestion[]> {
  const client = getClaudeClient();

  const userMessage = `## 現在のイベント
タイトル: ${input.currentEventTitle}
カテゴリ: ${input.currentEventCategory ?? "未分類"}

## 参加者プロファイル
- 確定参加者数: ${input.participantCount}名
- AIレベル分布（このイベント以外の参加履歴ベース）: ${JSON.stringify(input.aiLevelDistribution)}

## 参加者が他に参加しているカテゴリ（上位）
${
    input.topCategories.length > 0
      ? input.topCategories.map((c) => `- ${c.name}: ${c.count}名`).join("\n")
      : "（参加履歴なし）"
  }

## 主催者の過去開催カテゴリ（重複を避ける）
${
    input.organizerPastCategories.length > 0
      ? input.organizerPastCategories.join(", ")
      : "（過去開催なし）"
  }

上記を元に、次回開催すると効果的なイベントを3つ提案してください。`;

  try {
    const response = await client.messages.parse({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS_DEFAULT,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      output_config: {
        format: zodOutputFormat(SyllabusResponseSchema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error("Claude returned no structured output");
    }
    return parsed.suggestions.slice(0, 3);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      throw new Error(
        "Claude APIのレート制限に達しました。しばらく待ってから再試行してください"
      );
    }
    if (e instanceof Anthropic.AuthenticationError) {
      throw new Error("ANTHROPIC_API_KEY が無効です");
    }
    if (e instanceof Anthropic.APIError) {
      throw new Error(
        `Claude API エラー (${e.status}): ${e.message}`
      );
    }
    throw e;
  }
}
