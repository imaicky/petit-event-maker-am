import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function MenuThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; email?: string }>;
}) {
  const { id } = await params;
  const { name, email } = await searchParams;
  const supabase = await createClient();

  const { data: menu } = await supabase
    .from("menus")
    .select("id, title, creator_id")
    .eq("id", id)
    .single();

  if (!menu) {
    notFound();
  }

  // Fetch LINE friend URL
  let lineFriendUrl: string | null = null;
  if (menu.creator_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data: lineAccount } = await admin
        .from("line_accounts")
        .select("bot_basic_id")
        .eq("user_id", menu.creator_id)
        .eq("is_active", true)
        .maybeSingle();
      if (lineAccount?.bot_basic_id) {
        lineFriendUrl = `https://line.me/R/ti/p/${lineAccount.bot_basic_id}`;
      }
    } catch {
      // non-critical
    }
  }

  return (
    <div className="min-h-dvh bg-[#FAFAFA] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1A1A1A]">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Thank you text */}
        <div>
          <h1
            className="text-2xl font-bold text-[#1A1A1A] mb-2"
            style={{ fontFamily: "var(--font-zen-maru)" }}
          >
            お申し込みありがとうございます
          </h1>
          {name && (
            <p className="text-sm text-[#666666]">
              {name} 様のお申し込みを受け付けました
            </p>
          )}
        </div>

        {/* Menu info */}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 text-left">
          <p className="text-xs text-[#999999] mb-1">申し込みメニュー</p>
          <p className="font-bold text-[#1A1A1A]">{menu.title}</p>
          {email && (
            <p className="text-xs text-[#999999] mt-3">
              確認メールを {email} に送信しました
            </p>
          )}
        </div>

        {/* LINE friend add */}
        {lineFriendUrl && (
          <a
            href={lineFriendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#06C755] text-white font-medium text-sm hover:bg-[#05b34c] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEで友だち追加
          </a>
        )}

        {/* Back link */}
        <Link href={`/menus/${id}`}>
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl border-[#E5E5E5] gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            メニューに戻る
          </Button>
        </Link>
      </div>
    </div>
  );
}
