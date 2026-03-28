export type TemplateId = "reminder" | "change" | "thanks" | "custom";

export interface EmailTemplate {
  id: TemplateId;
  label: string;
  emoji: string;
  defaultSubject: string;
  defaultBody: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "reminder",
    label: "リマインダー",
    emoji: "🔔",
    defaultSubject: "【リマインダー】{eventTitle}",
    defaultBody:
      "いつもありがとうございます。\n\n{eventTitle}の開催が近づいてまいりました。\n\n日時：{eventDate}\n場所：{eventLocation}\n\n当日お会いできることを楽しみにしております。\nどうぞお気をつけてお越しください。",
  },
  {
    id: "change",
    label: "変更通知",
    emoji: "📝",
    defaultSubject: "【変更のお知らせ】{eventTitle}",
    defaultBody:
      "いつもありがとうございます。\n\n{eventTitle}について、以下の変更がございますのでお知らせいたします。\n\n【変更内容】\n（ここに変更内容をご記入ください）\n\nご不明な点がございましたら、お気軽にお問い合わせください。",
  },
  {
    id: "thanks",
    label: "お礼",
    emoji: "🙏",
    defaultSubject: "【ありがとうございました】{eventTitle}",
    defaultBody:
      "{eventTitle}にご参加いただき、誠にありがとうございました。\n\n皆さまのおかげで素敵なイベントになりました。\nまたのご参加を心よりお待ちしております。\n\nよろしければ、イベントの感想をお聞かせください。\n{eventUrl}",
  },
  {
    id: "custom",
    label: "カスタム",
    emoji: "✏️",
    defaultSubject: "",
    defaultBody: "",
  },
];

/**
 * Replace template placeholders with actual values
 */
export function fillTemplate(
  text: string,
  vars: {
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    eventUrl: string;
  }
): string {
  return text
    .replace(/{eventTitle}/g, vars.eventTitle)
    .replace(/{eventDate}/g, vars.eventDate)
    .replace(/{eventLocation}/g, vars.eventLocation)
    .replace(/{eventUrl}/g, vars.eventUrl);
}

/**
 * Wrap plain text body in a simple HTML email layout
 */
export function wrapInHtml(body: string, eventTitle: string): string {
  const escapedBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#ffffff;border-radius:16px;border:1px solid #e5e5e5;padding:32px 24px">
      <p style="font-size:13px;color:#999;margin:0 0 8px">${eventTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      <div style="font-size:15px;color:#1a1a1a;line-height:1.7">${escapedBody}</div>
    </div>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:24px">
      このメールは「プチイベント作成くん」を通じて送信されました
    </p>
  </div>
</body>
</html>`;
}
