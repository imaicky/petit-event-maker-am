// Builds the body text and subject for booking-confirmation / waitlist emails.
// Used by both the booking flow and the "resend confirmation" endpoint.

interface EventForEmail {
  title: string;
  datetime: string;
  location: string | null;
  location_type: string | null;
  online_url: string | null;
  zoom_meeting_id: string | null;
  zoom_passcode: string | null;
  location_url: string | null;
  price: number;
}

interface BuildArgs {
  event: EventForEmail;
  guestName: string;
  bookingId: string;
  isWaitlisted: boolean;
  lineFriendUrl?: string | null;
}

function formatDatetime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    });
  } catch {
    return iso;
  }
}

function buildLocationLines(event: EventForEmail): string {
  const buildOnlineLines = (): string => {
    if (event.zoom_meeting_id) {
      let lines = `■ ZoomミーティングID：${event.zoom_meeting_id}`;
      if (event.zoom_passcode) lines += `\n■ Zoomパスコード：${event.zoom_passcode}`;
      if (event.online_url) lines += `\n■ 参加URL：${event.online_url}`;
      return lines;
    }
    if (event.online_url) return `■ オンラインURL：${event.online_url}`;
    return "■ オンライン（URLは後日お知らせします）";
  };

  if (event.location_type === "online") return buildOnlineLines();
  if (event.location_type === "hybrid") {
    let lines = `■ 場所：${event.location ?? "未定"}`;
    if (event.location_url) lines += `\n■ 地図URL：${event.location_url}`;
    return `${lines}\n${buildOnlineLines()}`;
  }
  let lines = `■ 場所：${event.location ?? "未定"}`;
  if (event.location_url) lines += `\n■ 地図URL：${event.location_url}`;
  return lines;
}

export function buildBookingEmail({
  event,
  guestName,
  bookingId,
  isWaitlisted,
  lineFriendUrl,
}: BuildArgs): { subject: string; body: string } {
  const dateStr = formatDatetime(event.datetime);
  const priceStr = event.price === 0 ? "無料" : `¥${event.price.toLocaleString("ja-JP")}`;
  const locationLines = buildLocationLines(event);

  const subject = isWaitlisted
    ? `【キャンセル待ち登録完了】${event.title}`
    : `【申し込み完了】${event.title}`;

  const lineSection = lineFriendUrl
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📱 LINEで予約確認・リマインドを受け取る\n以下のリンクから友だち追加してください：\n${lineFriendUrl}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : "";

  const body = isWaitlisted
    ? `${guestName} 様

${event.title} のキャンセル待ちに登録されました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約番号：${bookingId}
■ イベント：${event.title}
■ 日時：${dateStr}
${locationLines}
■ 参加費：${priceStr}
■ ステータス：キャンセル待ち
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

空きが出た場合、自動的に予約が確定されメールでお知らせします。
${lineSection}
プチイベント作成くん`
    : `${guestName} 様

${event.title} へのお申し込みが完了しました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 予約番号：${bookingId}
■ イベント：${event.title}
■ 日時：${dateStr}
${locationLines}
■ 参加費：${priceStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ご不明な点は主催者までお問い合わせください。
当日のご参加を心よりお待ちしております。
${lineSection}
プチイベント作成くん`;

  return { subject, body };
}
