// Event templates for different teacher types.
// Each template provides sensible defaults to pre-fill the create-event form.

export interface EventTemplate {
  id: string;
  icon: string;
  title: string;
  description: string;
  defaultCapacity: number;
  defaultPrice: number;
  category: string;
}

// 主催者ジャンルを横断的にカバー。
// 表示順は使われそうな上位から並べる。
// 既存イベントが参照している旧カテゴリ名（「フラワー」「LLM活用」など）も
// 後方互換のため残してある。
export const CATEGORIES = [
  // ─── 教室・ハンドメイド系（先生需要が高い） ─────────
  "ハンドメイド",
  "フラワー",
  "カメラ",
  "ネイル",
  "占い",
  "ヨガ",
  "お教室・レッスン",
  // ─── 交流・コミュニティ ─────────────────
  "ランチ会",
  "飲み会・交流会",
  // ─── SNS / 集客 / クリエイター ──────────
  "Instagram",
  "YouTube・動画",
  "SNS集客",
  // ─── AI領域 ────────────────────────
  "LLM活用",
  "画像生成",
  "プロンプトエンジニアリング",
  "AI×ビジネス",
  "AI開発・実装",
  // ─── その他 ────────────────────────
  "その他",
] as const;

export type Category = (typeof CATEGORIES)[number];

// 主催者ジャンル横断のテンプレ。12個に絞り、生活系・SNS系・AI系をバランス。
export const TEMPLATES: EventTemplate[] = [
  // ─── 教室・ハンドメイド系 ─────────────────
  {
    id: "lesson",
    icon: "🌟",
    title: "🌟 お教室・お稽古レッスン（体験）",
    description:
      "初めての方向けの体験レッスンです。\n\nお気軽にいらしてください。基本から丁寧にお伝えします。\n\n📦 持ち物：手ぶらでOK（必要な道具は貸出します）\n✅ 少人数制で1人ひとり丁寧にサポート\n💬 レッスン後の質問もお気軽にどうぞ",
    defaultCapacity: 6,
    defaultPrice: 3000,
    category: "お教室・レッスン",
  },
  {
    id: "flower",
    icon: "🌸",
    title: "🌸 フラワーアレンジメント体験",
    description:
      "季節のお花を使ったフラワーアレンジメント体験教室です。\n\n花の選び方から美しく飾る技法まで、丁寧にお伝えします。初心者の方でも安心してご参加いただけます。\n\n📦 持ち物：エプロン（貸出あり）\n🌺 作品はお持ち帰りいただけます\n✅ 少人数制で丁寧に指導します",
    defaultCapacity: 6,
    defaultPrice: 3500,
    category: "フラワー",
  },
  {
    id: "accessory",
    icon: "💎",
    title: "💎 ハンドメイドアクセサリー教室",
    description:
      "天然石やビーズを使ったアクセサリー作りを体験しましょう！\n\nネックレス・ブレスレットなど、お好みのアクセサリーをご自身で制作できます。\n\n📦 持ち物：なし（材料はすべてご用意します）\n💍 作品はお持ち帰りいただけます\n✅ デザインのご相談もお気軽に",
    defaultCapacity: 8,
    defaultPrice: 4000,
    category: "ハンドメイド",
  },
  {
    id: "camera",
    icon: "📷",
    title: "📷 カメラ撮影会・フォト体験",
    description:
      "プロカメラマンが丁寧に指導する撮影会です。\n\n構図の基本から光の使い方、ポートレート撮影のコツまで実践しながら学べます。スマホカメラでもOKです。\n\n📦 持ち物：カメラまたはスマートフォン\n📸 撮影した写真はその場でフィードバック\n✅ 初心者から中級者まで歓迎します",
    defaultCapacity: 10,
    defaultPrice: 2500,
    category: "カメラ",
  },
  {
    id: "nail",
    icon: "💅",
    title: "💅 ネイルアート体験レッスン",
    description:
      "セルフネイルのコツが身につく体験レッスンです。\n\n基本のケアから人気デザインまで、使いやすいジェルネイルを使って丁寧にお伝えします。\n\n📦 持ち物：なし（材料・道具はすべてご用意します）\n💅 当日仕上げた爪はそのままお帰りいただけます\n✅ 初めての方も安心のサポート体制です",
    defaultCapacity: 4,
    defaultPrice: 5000,
    category: "ネイル",
  },
  {
    id: "fortune",
    icon: "🔮",
    title: "🔮 占い鑑定セッション",
    description:
      "タロットカード・西洋占星術を使った個別鑑定セッションです。\n\n恋愛・仕事・人間関係など、あなたが気になるテーマについて丁寧にリーディングします。\n\n✨ 事前にご相談テーマをお聞きします\n🃏 録音・メモOKです\n✅ プライバシーへの配慮を徹底しています",
    defaultCapacity: 1,
    defaultPrice: 3000,
    category: "占い",
  },
  {
    id: "yoga",
    icon: "🧘",
    title: "🧘 ヨガ・ピラティス体験レッスン",
    description:
      "ヨガが初めての方でも安心して参加できる体験レッスンです。\n\n呼吸の整え方から基本のポーズまで、丁寧にお伝えします。動きやすい服装でお気軽にどうぞ。\n\n📦 持ち物：動きやすい服装、タオル（レンタルマット500円あり）\n✅ 少人数制なので個別のサポートが受けられます",
    defaultCapacity: 8,
    defaultPrice: 1500,
    category: "ヨガ",
  },
  // ─── 交流系 ────────────────────────────
  {
    id: "lunch",
    icon: "🍽️",
    title: "🍽️ ランチ会・飲み会・交流会",
    description:
      "気軽に参加できる交流イベントです！\n\nおいしいご飯やお酒を楽しみながら、ゆるくおしゃべりしましょう。初めての方も大歓迎です。\n\n🍴 お店：当日ご案内します\n💰 参加費：各自のお食事代のみ\n✅ お一人参加も大歓迎\n📱 当日の連絡先は申し込み後にお伝えします",
    defaultCapacity: 8,
    defaultPrice: 0,
    category: "飲み会・交流会",
  },
  // ─── SNS・クリエイター系 ──────────────────
  {
    id: "instagram",
    icon: "📱",
    title: "📱 Instagram集客・運用講座",
    description:
      "Instagramを使った集客・ブランディングの基本を学べる講座です。\n\nプロフィール設計・投稿の作り方・リール活用・フォロワーの増やし方まで、実践的なノウハウをお伝えします。\n\n📦 持ち物：スマートフォン（Instagram アプリ入り）\n📊 その場でアカウント診断も行います\n✅ 個人事業主・教室運営者におすすめです",
    defaultCapacity: 10,
    defaultPrice: 5000,
    category: "Instagram",
  },
  {
    id: "youtube",
    icon: "🎬",
    title: "🎬 YouTube・動画クリエイター講座",
    description:
      "YouTubeチャンネル運営や動画制作のはじめ方を学べる講座です。\n\nチャンネル設計・撮影のコツ・編集の基本・登録者を増やすためのサムネ＆タイトル戦略まで、ゼロから実践的に学べます。\n\n📦 持ち物：スマホまたはノートPC\n💡 自分のチャンネルテーマを当日中に固めます\n✅ 個人クリエイター・副業ではじめたい方におすすめ",
    defaultCapacity: 10,
    defaultPrice: 5000,
    category: "YouTube・動画",
  },
  // ─── AI領域（厳選3個） ──────────────────
  {
    id: "ai-llm-basic",
    icon: "🤖",
    title: "🤖 ChatGPT / Claude 入門：仕事を10倍速にする使い方",
    description:
      "ChatGPT・Claude などの生成AIを、仕事や日常で実用的に使いこなすための入門講座です。\n\n📌 こんな方におすすめ：\n・AIツールを使い始めたばかり\n・もっと業務効率化したい\n・プロンプトの基本を体系立てて学びたい\n\n📦 持ち物：ノートPC または スマートフォン\n💡 当日中に「自分の仕事に効くプロンプト」を3本以上作ります\n✅ 初心者向けに丁寧に解説します",
    defaultCapacity: 12,
    defaultPrice: 3500,
    category: "LLM活用",
  },
  {
    id: "ai-image-gen",
    icon: "🎨",
    title: "🎨 AI画像生成体験会（Midjourney / Stable Diffusion）",
    description:
      "Midjourney と Stable Diffusion を使って、思い通りのビジュアルを作るためのプロンプト技法を学びます。\n\n📌 こんな方におすすめ：\n・SNS や広告のビジュアル制作にAIを使いたい\n・キャラクター・背景・素材を量産したい\n・スタイルや構図を自在にコントロールしたい\n\n📦 持ち物：ノートPC または タブレット\n💡 当日中に最低5枚、Pinterest映えするビジュアルを作ります\n✅ 初心者〜中級者対象",
    defaultCapacity: 8,
    defaultPrice: 4500,
    category: "画像生成",
  },
  {
    id: "ai-business",
    icon: "💼",
    title: "💼 AI×業務自動化セミナー｜ノーコードで始める",
    description:
      "n8n / Dify などのノーコードツールと AI を組み合わせて、業務を自動化する手法を学びます。\n\n📌 こんな方におすすめ：\n・経理・人事・営業の手作業を減らしたい\n・チームで使える AI 業務フローを作りたい\n・コードを書かずに自動化したい\n\n📦 持ち物：ノートPC\n💡 自社の業務フローを1つ自動化するワークショップ付き\n✅ 非エンジニア・マネージャー向け",
    defaultCapacity: 15,
    defaultPrice: 6000,
    category: "AI×ビジネス",
  },
];
