"use client";

import { useState } from "react";
import { Mail, MessageCircle, Loader2 } from "lucide-react";

type Channel = "email" | "line";

export function NotifyToggle({
  username,
  initialEmail,
  initialLine,
}: {
  username: string;
  initialEmail: boolean;
  initialLine: boolean;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [line, setLine] = useState(initialLine);
  const [busy, setBusy] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(channel: Channel) {
    setBusy(channel);
    setError(null);
    const optimistic = channel === "email" ? !email : !line;
    if (channel === "email") setEmail(optimistic);
    else setLine(optimistic);

    try {
      const res = await fetch(`/api/profiles/${username}/follow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          channel === "email"
            ? { notify_email: optimistic }
            : { notify_line: optimistic }
        ),
      });
      if (!res.ok) {
        // rollback
        if (channel === "email") setEmail((v) => !v);
        else setLine((v) => !v);
        setError("更新に失敗しました");
      }
    } catch {
      if (channel === "email") setEmail((v) => !v);
      else setLine((v) => !v);
      setError("ネットワークエラー");
    } finally {
      setBusy(null);
    }
  }

  const pillCls = (on: boolean) =>
    `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
      on
        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
        : "border-[#E5E5E5] bg-white text-[#999999] hover:border-[#1A1A1A]/30"
    }`;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={busy !== null}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle("email");
        }}
        className={pillCls(email)}
        title={email ? "メール通知ON（クリックでOFF）" : "メール通知OFF（クリックでON）"}
      >
        {busy === "email" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Mail className="h-3 w-3" />
        )}
        メール
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle("line");
        }}
        className={pillCls(line)}
        title={line ? "LINE通知ON（クリックでOFF）" : "LINE通知OFF（クリックでON）"}
      >
        {busy === "line" ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <MessageCircle className="h-3 w-3" />
        )}
        LINE
      </button>
      {error && (
        <span className="text-[10px] text-red-500">{error}</span>
      )}
    </div>
  );
}
