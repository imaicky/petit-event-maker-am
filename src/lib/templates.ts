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

// AI領域カテゴリ（主軸）+ ライフスタイル系（既存互換）
// ─────────────────────────────────────────────
// 表示優先度は AI系を先頭に。
// DBの event_categories と完全に一致させる必要はないが、
// 名称（日本語ラベル）は揃えてある。
export const CATEGORIES = [
  // ─── AI領域（主軸） ─────────────────────
  "LLM活用",
  "画像生成",
  "動画生成・編集",
  "音声・音楽",
  "プロンプトエンジニアリング",
  "AI開発・実装",
  "AI×ビジネス",
  "AI×クリエイティブ",
  "AIコミュニティ・座談会",
  // ─── ライフスタイル系（既存・後方互換） ──
  "フラワー",
  "ハンドメイド",
  "カメラ",
  "ネイル",
  "占い",
  "ヨガ",
  "ランチ会",
  "Instagram",
  "その他",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const TEMPLATES: EventTemplate[] = [
  {
    id: "flower",
    icon: "🌸",
    title: "🌸 フラワーアレンジメント体験",
    description:
      "季節のお花を使ったフラワーアレンジメント体験教室です。\n\n花の選び方から美しく飾る技法まで、丁寧にお伝えします。初心者の方でも安心してご参加いただけます。\n\n📦 持ち物：エプロン（貸出あり）\n🌺 作品はお持ち帰りいただけます。\n✅ 少人数制で丁寧に指導します。",
    defaultCapacity: 6,
    defaultPrice: 3500,
    category: "フラワー",
  },
  {
    id: "accessory",
    icon: "💎",
    title: "💎 ハンドメイドアクセサリー教室",
    description:
      "天然石やビーズを使ったアクセサリー作りを体験しましょう！\n\nネックレス・ブレスレットなど、お好みのアクセサリーをご自身で制作できます。\n\n📦 持ち物：なし（材料はすべてご用意します）\n💍 作品はお持ち帰りいただけます。\n✅ デザインのご相談もお気軽に。",
    defaultCapacity: 8,
    defaultPrice: 4000,
    category: "ハンドメイド",
  },
  {
    id: "camera",
    icon: "📷",
    title: "📷 カメラ撮影会・フォト体験",
    description:
      "プロカメラマンが丁寧に指導する撮影会です。\n\n構図の基本から光の使い方、ポートレート撮影のコツまで実践しながら学べます。スマホカメラでもOKです。\n\n📦 持ち物：カメラまたはスマートフォン\n📸 撮影した写真はその場でフィードバック。\n✅ 初心者から中級者まで歓迎します。",
    defaultCapacity: 10,
    defaultPrice: 2500,
    category: "カメラ",
  },
  {
    id: "nail",
    icon: "💅",
    title: "💅 ネイルアート体験レッスン",
    description:
      "セルフネイルのコツが身につく体験レッスンです。\n\n基本のケアから人気デザインまで、使いやすいジェルネイルを使って丁寧にお伝えします。\n\n📦 持ち物：なし（材料・道具はすべてご用意します）\n💅 当日仕上げた爪はそのままお帰りいただけます。\n✅ 初めての方も安心のサポート体制です。",
    defaultCapacity: 4,
    defaultPrice: 5000,
    category: "ネイル",
  },
  {
    id: "fortune",
    icon: "🔮",
    title: "🔮 占い鑑定セッション",
    description:
      "タロットカード・西洋占星術を使った個別鑑定セッションです。\n\n恋愛・仕事・人間関係など、あなたが気になるテーマについて丁寧にリーディングします。\n\n✨ 事前にご相談テーマをお聞きします。\n🃏 録音・メモOKです。\n✅ プライバシーへの配慮を徹底しています。",
    defaultCapacity: 1,
    defaultPrice: 3000,
    category: "占い",
  },
  {
    id: "yoga",
    icon: "🧘",
    title: "🧘 ヨガ・ピラティス体験レッスン",
    description:
      "ヨガが初めての方でも安心して参加できる体験レッスンです。\n\n呼吸の整え方から基本のポーズまで、丁寧にお伝えします。動きやすい服装でお気軽にどうぞ。\n\n📦 持ち物：動きやすい服装、タオル（レンタルマット500円あり）\n✅ 少人数制なので個別のサポートが受けられます。",
    defaultCapacity: 8,
    defaultPrice: 1500,
    category: "ヨガ",
  },
  {
    id: "lunch",
    icon: "🍽️",
    title: "🍽️ ランチ会・お食事会",
    description:
      "気軽に参加できるランチ会です！\n\n美味しいご飯を食べながら、楽しくおしゃべりしましょう。初めての方も大歓迎です。\n\n🍴 お店：当日ご案内します\n💰 参加費：各自のお食事代のみ\n✅ お一人参加も大歓迎です。\n📱 当日の連絡先は申し込み後にお伝えします。",
    defaultCapacity: 8,
    defaultPrice: 0,
    category: "ランチ会",
  },
  {
    id: "instagram",
    icon: "📱",
    title: "📱 Instagram集客・運用講座",
    description:
      "Instagramを使った集客・ブランディングの基本を学べる講座です。\n\nプロフィール設計・投稿の作り方・リール活用・フォロワーの増やし方まで、実践的なノウハウをお伝えします。\n\n📦 持ち物：スマートフォン（Instagram アプリ入り）\n📊 その場でアカウント診断も行います。\n✅ 個人事業主・教室運営者におすすめです。",
    defaultCapacity: 10,
    defaultPrice: 5000,
    category: "Instagram",
  },
  // ─── AI領域テンプレート ───────────────────────────────────────────
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
    id: "ai-prompt-eng",
    icon: "📝",
    title: "📝 プロンプトエンジニアリング実践ワークショップ",
    description:
      "成果が出るプロンプト設計の原則と、評価・改善の方法論を実例ベースで習得します。\n\n📌 学べること：\n・Few-shot / CoT / 役割設定の使い分け\n・出力品質を測るためのevalの作り方\n・本番運用で失敗しないガードレール設計\n\n📦 持ち物：ノートPC（API キーは不要、講師側で用意）\n💡 業務シナリオに合わせて自分のプロンプトを完成させます\n✅ 中級者向け（生成AIの基本操作経験が前提）",
    defaultCapacity: 10,
    defaultPrice: 8000,
    category: "プロンプトエンジニアリング",
  },
  {
    id: "ai-image-gen",
    icon: "🎨",
    title: "🎨 Midjourney / Stable Diffusion 画像生成 体験会",
    description:
      "Midjourney と Stable Diffusion を使って、思い通りのビジュアルを作るためのプロンプト技法を学びます。\n\n📌 こんな方におすすめ：\n・SNS や広告のビジュアル制作にAIを使いたい\n・キャラクター・背景・素材を量産したい\n・スタイルや構図を自在にコントロールしたい\n\n📦 持ち物：ノートPC または タブレット\n💡 当日中に最低5枚、Pinterest映えするビジュアルを作ります\n✅ 初心者〜中級者対象",
    defaultCapacity: 8,
    defaultPrice: 4500,
    category: "画像生成",
  },
  {
    id: "ai-agent-dev",
    icon: "⚙️",
    title: "⚙️ AIエージェント開発ハンズオン（MCP / RAG）",
    description:
      "Claude / GPT を使ったAIエージェント、MCP対応ツール、RAG（検索拡張生成）の実装を体験するハンズオンです。\n\n📌 学べること：\n・MCP の基本概念とサーバ実装\n・自前データを Claude に繋ぐ RAG パイプライン\n・タスクを分解して実行するエージェントの作り方\n\n📦 持ち物：ノートPC（Node.js または Python の開発環境）\n💡 ハンズオン後、自分のローカル環境で動くエージェントが手に入ります\n✅ 開発者向け（プログラミング経験が前提）",
    defaultCapacity: 6,
    defaultPrice: 12000,
    category: "AI開発・実装",
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
  {
    id: "ai-creative",
    icon: "✨",
    title: "✨ AI×クリエイティブ｜広告コピー＆ビジュアル量産講座",
    description:
      "ChatGPT/Claude でコピーを、Midjourney/SD でビジュアルを、組み合わせて広告クリエイティブを量産する実践講座。\n\n📌 学べること：\n・コピーのトンマナを揃えるプロンプト技法\n・ターゲット別 A/B 案の高速作成\n・ブランドガイドラインに沿った出力制御\n\n📦 持ち物：ノートPC\n💡 自社プロダクト想定で広告セットを5本仕上げます\n✅ クリエイター・マーケター向け",
    defaultCapacity: 10,
    defaultPrice: 7000,
    category: "AI×クリエイティブ",
  },
  {
    id: "ai-mokumoku",
    icon: "💻",
    title: "💻 AI もくもく会｜各自のプロジェクトを進める",
    description:
      "生成AI/エージェント開発/プロンプト改善など、各自で抱えているテーマをもくもくと進める時間です。\n\n📌 こんな方におすすめ：\n・進捗が滞っているAIプロジェクトを推進したい\n・他の開発者・クリエイターと交流しつつ作業したい\n・つまずきポイントを質問しあいたい\n\n📦 持ち物：ノートPC、作業したいテーマ\n💡 終了前に簡単な成果共有タイムあり\n✅ レベル不問・テーマ自由",
    defaultCapacity: 12,
    defaultPrice: 1500,
    category: "AIコミュニティ・座談会",
  },
];
