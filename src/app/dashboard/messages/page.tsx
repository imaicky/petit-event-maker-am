"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Loader2,
  MessageCircle,
  Send,
  Mail,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

type Conversation = {
  follower: {
    id: string;
    line_user_id: string;
    display_name: string | null;
    picture_url: string | null;
    is_following: boolean;
  };
  last_message: {
    content: string;
    direction: string;
    created_at: string;
  };
  unread_count: number;
};

type Message = {
  id: string;
  direction: "incoming" | "outgoing";
  message_type: string;
  content: string;
  created_at: string;
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) {
      return d.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return "昨日";
    if (diffDays < 7) return `${diffDays}日前`;
    return d.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export default function MessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<"line" | "email" | "both">("line");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/line/conversations");
      if (res.ok) {
        const json = await res.json();
        setConversations(json.conversations ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  const fetchMessages = useCallback(async (lineUserId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(
        `/api/line/messages?line_user_id=${encodeURIComponent(lineUserId)}`
      );
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages ?? []);
      }
    } catch {
      // ignore
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.follower.line_user_id);
    }
  }, [selected, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch("/api/line/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_user_id: selected.follower.line_user_id,
          content: replyText.trim(),
          channel,
        }),
      });
      if (res.ok) {
        setReplyText("");
        // Refresh messages
        await fetchMessages(selected.follower.line_user_id);
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A1A1A]" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA]">
      <Header />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[#999999] hover:text-[#1A1A1A] transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          ダッシュボードへ戻る
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755]/10">
              <MessageCircle className="h-5 w-5 text-[#06C755]" />
            </div>
            <h1
              className="text-2xl font-bold text-[#1A1A1A]"
              style={{ fontFamily: "var(--font-zen-maru)" }}
            >
              メッセージ
            </h1>
          </div>
          <p className="mt-2 text-sm text-[#999999]">
            LINEフォロワーとの会話を管理できます
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#999999]" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F2F2F2] mb-4">
              <MessageCircle className="h-8 w-8 text-[#E5E5E5]" />
            </div>
            <p className="text-sm text-[#999999]">
              まだメッセージはありません
            </p>
            <p className="text-xs text-[#999999] mt-1">
              LINEからメッセージが届くとここに表示されます
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]">
            {/* Conversation list */}
            <div className="md:col-span-1 rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F2F2F2]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#999999]">
                  会話一覧
                </h2>
              </div>
              <div className="divide-y divide-[#F2F2F2] max-h-[500px] overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.follower.id}
                    type="button"
                    onClick={() => setSelected(conv)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#FAFAFA] transition-colors ${
                      selected?.follower.id === conv.follower.id
                        ? "bg-[#F7F7F7]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {conv.follower.picture_url ? (
                        <Image
                          src={conv.follower.picture_url}
                          alt={conv.follower.display_name ?? ""}
                          width={36}
                          height={36}
                          className="rounded-full shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-[#E5E5E5] flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4 text-[#999999]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#1A1A1A] truncate">
                            {conv.follower.display_name || "名前なし"}
                          </p>
                          <span className="text-xs text-[#999999] shrink-0 ml-2">
                            {formatTime(conv.last_message.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-[#999999] truncate">
                            {conv.last_message.direction === "outgoing"
                              ? "あなた: "
                              : ""}
                            {conv.last_message.content}
                          </p>
                          {conv.unread_count > 0 && (
                            <span className="ml-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#06C755] px-1 text-[10px] font-bold text-white shrink-0">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message thread */}
            <div className="md:col-span-2 rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden flex flex-col">
              {selected ? (
                <>
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-[#F2F2F2] flex items-center gap-3">
                    {selected.follower.picture_url ? (
                      <Image
                        src={selected.follower.picture_url}
                        alt={selected.follower.display_name ?? ""}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#E5E5E5] flex items-center justify-center">
                        <Users className="h-4 w-4 text-[#999999]" />
                      </div>
                    )}
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {selected.follower.display_name || "名前なし"}
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[300px] max-h-[400px]">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-[#999999]" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-center text-sm text-[#999999] py-8">
                        メッセージはありません
                      </p>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.direction === "outgoing"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.direction === "outgoing"
                                ? "bg-[#1A1A1A] text-white"
                                : "bg-[#F2F2F2] text-[#1A1A1A]"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                msg.direction === "outgoing"
                                  ? "text-white/60"
                                  : "text-[#999999]"
                              }`}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply form */}
                  <div className="border-t border-[#F2F2F2] px-4 py-3">
                    {/* Channel selector */}
                    <div className="flex gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setChannel("line")}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          channel === "line"
                            ? "bg-[#06C755] text-white"
                            : "bg-[#F2F2F2] text-[#999999] hover:text-[#1A1A1A]"
                        }`}
                      >
                        <MessageCircle className="h-3 w-3" />
                        LINE
                      </button>
                      <button
                        type="button"
                        onClick={() => setChannel("email")}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          channel === "email"
                            ? "bg-[#1A1A1A] text-white"
                            : "bg-[#F2F2F2] text-[#999999] hover:text-[#1A1A1A]"
                        }`}
                      >
                        <Mail className="h-3 w-3" />
                        メール
                      </button>
                      <button
                        type="button"
                        onClick={() => setChannel("both")}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          channel === "both"
                            ? "bg-[#1A1A1A] text-white"
                            : "bg-[#F2F2F2] text-[#999999] hover:text-[#1A1A1A]"
                        }`}
                      >
                        両方
                      </button>
                    </div>

                    <div className="flex items-end gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="メッセージを入力..."
                        className="flex-1 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-sm resize-none focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={sending || !replyText.trim()}
                        size="sm"
                        className="h-10 w-10 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white p-0"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-[#999999] mt-1">
                      Cmd+Enter で送信
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="h-10 w-10 text-[#E5E5E5] mx-auto mb-2" />
                    <p className="text-sm text-[#999999]">
                      会話を選択してください
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#E5E5E5] py-6 text-center text-xs text-[#999999] hidden sm:block">
        <p>&copy; 2026 プチイベント作成くん</p>
      </footer>
    </div>
  );
}
