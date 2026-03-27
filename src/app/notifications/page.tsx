import { Header } from "@/components/header";
import { NotificationsClient } from "./notifications-client";

export const metadata = {
  title: "通知 | プチイベント作成くん",
};

export default function NotificationsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#FAFAFA]">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1
          className="mb-6 text-2xl font-bold text-[#1A1A1A]"
          style={{ fontFamily: "var(--font-zen-maru)" }}
        >
          通知
        </h1>
        <NotificationsClient />
      </main>
      <footer className="border-t border-[#E5E5E5] py-6 text-center text-xs text-[#999999]">
        <p>© 2026 プチイベント作成くん</p>
      </footer>
    </div>
  );
}
