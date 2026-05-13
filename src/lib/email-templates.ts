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
 * Replace template placeholders with actual values.
 *
 * Adversarial fix: 単一パスでの置換を使う。
 * 連続 .replace チェーンだと「先に置換された値の中に別のプレースホルダーが含まれていた」
 * 場合に二重置換され、ユーザー由来の値が他フィールドの値に化ける（XSS/spoofing）。
 * 単一の正規表現マッチで決着させる。
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
  const map: Record<string, string> = {
    eventTitle: vars.eventTitle,
    eventDate: vars.eventDate,
    eventLocation: vars.eventLocation,
    eventUrl: vars.eventUrl,
  };
  return text.replace(/\{(eventTitle|eventDate|eventLocation|eventUrl)\}/g, (_, key: string) =>
    map[key] ?? `{${key}}`
  );
}

/**
 * Build a reminder email HTML for attendees.
 * For online/hybrid events the join info (Zoom ID + passcode, or fallback URL)
 * is included so attendees don't have to dig up their original confirmation email.
 */
export function buildReminderEmailHtml(
  eventTitle: string,
  dateStr: string,
  location: string,
  timeLabel: string,
  online?: {
    locationType?: string | null;
    onlineUrl?: string | null;
    zoomMeetingId?: string | null;
    zoomPasscode?: string | null;
  }
): string {
  const locationType = online?.locationType ?? "physical";
  const onlineUrl = online?.onlineUrl ?? null;
  const zoomMeetingId = online?.zoomMeetingId ?? null;
  const zoomPasscode = online?.zoomPasscode ?? null;

  function buildOnlineLines(): string {
    if (zoomMeetingId) {
      let lines = `■ ZoomミーティングID：${zoomMeetingId}`;
      if (zoomPasscode) lines += `\n■ Zoomパスコード：${zoomPasscode}`;
      if (onlineUrl) lines += `\n■ 参加URL：${onlineUrl}`;
      return lines;
    }
    if (onlineUrl) return `■ 参加URL：${onlineUrl}`;
    return "";
  }

  let locationLines = `■ 場所：${location}`;
  if (locationType === "online") {
    const onlineInfo = buildOnlineLines();
    locationLines = onlineInfo || "■ 場所：オンライン";
  } else if (locationType === "hybrid") {
    const onlineInfo = buildOnlineLines();
    if (onlineInfo) locationLines += `\n${onlineInfo}`;
  }

  const body = `いつもありがとうございます。

${eventTitle}の開催が近づいてまいりました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ${timeLabel}
■ イベント：${eventTitle}
■ 日時：${dateStr}
${locationLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

当日お会いできることを楽しみにしております。
どうぞお気をつけてお越しください。

プチイベント作成くん`;

  return wrapInHtml(body, eventTitle);
}

/**
 * Build a "new event from a creator you follow" email body.
 * organizerName / unsubscribeUrl は HTML としてエスケープせずに渡し、
 * wrapInHtml が改行＋エスケープ処理を担当する（既存リマインダーと同方針）。
 */
export function buildNewEventEmailHtml(
  organizerName: string,
  eventTitle: string,
  dateStr: string,
  location: string,
  eventUrl: string,
  unsubscribeUrl: string
): string {
  const body = `${organizerName}さんが新しいイベントを公開しました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ イベント：${eventTitle}
■ 日時：${dateStr}
■ 場所：${location}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▼ 詳細・お申し込みはこちら
${eventUrl}

──────────────────────────────
このメールは ${organizerName} さんをフォローしているためお送りしました。
今後この主催者からの通知を停止する場合は次のページから設定できます。
${unsubscribeUrl}

プチイベント作成くん`;

  return wrapInHtml(body, eventTitle);
}

/**
 * 参加形式アンケート: 主催者が hybrid イベントの予約者全員に
 * 「リアルかオンラインか」を1クリックで答えてもらうメール本文。
 *
 * physicalUrl / onlineUrl は予約者ごとに発行された署名付きURL。
 * URL内のクエリで attendance_format が確定する。
 */
export function buildFormatSurveyEmailHtml(
  guestName: string,
  eventTitle: string,
  dateStr: string,
  location: string,
  physicalUrl: string,
  onlineUrl: string
): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const intro = `${safe(guestName)} 様\n\nお申し込みありがとうございます。\n${safe(eventTitle)} はリアル / オンラインの両方で参加できる「ハイブリッド開催」です。\nお手数ですが、当日の参加方法をお知らせください。\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n■ イベント：${safe(eventTitle)}\n■ 日時：${safe(dateStr)}\n■ 場所：${safe(location)}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#ffffff;border-radius:16px;border:1px solid #e5e5e5;padding:32px 24px">
      <p style="font-size:13px;color:#999;margin:0 0 8px">${safe(eventTitle)}</p>
      <div style="font-size:15px;color:#1a1a1a;line-height:1.7;white-space:pre-wrap">${intro.replace(/\n/g, "<br>")}</div>

      <div style="margin-top:28px;display:block">
        <p style="font-size:14px;font-weight:bold;color:#1a1a1a;margin:0 0 12px">↓ 当日の参加方法を1クリックで教えてください</p>
        <a href="${physicalUrl}"
           style="display:block;width:100%;box-sizing:border-box;background:#b45309;color:#ffffff;text-align:center;text-decoration:none;padding:14px 16px;border-radius:12px;font-weight:bold;font-size:15px;margin-bottom:10px">
          📍 リアル参加（会場）で確定する
        </a>
        <a href="${onlineUrl}"
           style="display:block;width:100%;box-sizing:border-box;background:#0369a1;color:#ffffff;text-align:center;text-decoration:none;padding:14px 16px;border-radius:12px;font-weight:bold;font-size:15px">
          🎥 オンライン参加で確定する
        </a>
      </div>

      <p style="margin-top:24px;font-size:12px;color:#999;line-height:1.6">
        ボタンを押すと、その場で参加形式が確定します。後で変更したい場合は主催者にご連絡ください。<br>
        このメールに心当たりがない場合は無視してください。
      </p>
    </div>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:24px">
      このメールは「プチイベント作成くん」を通じて送信されました
    </p>
  </div>
</body>
</html>`;
}

/**
 * お気に入り登録済み・未予約ユーザー向けの開催前リマインダー。
 * 「保存してたイベントが近いですよ」とそっと promote する。
 */
export function buildFavoriteReminderEmailHtml(
  guestName: string | null,
  eventTitle: string,
  dateStr: string,
  location: string,
  eventUrl: string,
  unfavoriteUrl: string
): string {
  const safe = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const greeting = guestName ? `${safe(guestName)} 様\n\n` : "";
  const body = `${greeting}お気に入りに保存したイベントの開催が近づいています。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ イベント：${safe(eventTitle)}
■ 日時：${safe(dateStr)}
■ 場所：${safe(location)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

定員が埋まる前にお申し込みください。`;

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#ffffff;border-radius:16px;border:1px solid #e5e5e5;padding:32px 24px">
      <p style="font-size:13px;color:#999;margin:0 0 8px">${safe(eventTitle)}</p>
      <div style="font-size:15px;color:#1a1a1a;line-height:1.7;white-space:pre-wrap">${body.replace(/\n/g, "<br>")}</div>

      <div style="margin-top:24px">
        <a href="${eventUrl}"
           style="display:inline-block;background:#1A1A1A;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:24px;font-weight:bold;font-size:15px">
          イベント詳細を見る
        </a>
      </div>

      <p style="margin-top:24px;font-size:11px;color:#999;line-height:1.6">
        このメールは「お気に入り登録」をしたイベントのため送信されました。<br>
        今後この通知が不要な場合は、<a href="${unfavoriteUrl}" style="color:#666;text-decoration:underline">お気に入り一覧</a>から解除してください。
      </p>
    </div>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:24px">
      プチイベント作成くん
    </p>
  </div>
</body>
</html>`;
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
