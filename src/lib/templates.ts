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

export const CATEGORIES = [
  "フラワー",
  "ハンドメイド",
  "カメラ",
  "ネイル",
  "占い",
  "ヨガ",
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
    id: "instagram",
    icon: "📱",
    title: "📱 Instagram集客・運用講座",
    description:
      "Instagramを使った集客・ブランディングの基本を学べる講座です。\n\nプロフィール設計・投稿の作り方・リール活用・フォロワーの増やし方まで、実践的なノウハウをお伝えします。\n\n📦 持ち物：スマートフォン（Instagram アプリ入り）\n📊 その場でアカウント診断も行います。\n✅ 個人事業主・教室運営者におすすめです。",
    defaultCapacity: 10,
    defaultPrice: 5000,
    category: "Instagram",
  },
];
