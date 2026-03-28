import { Resend } from "resend";

const BATCH_SIZE = 50;
const FROM_ADDRESS = "プチイベント作成くん <noreply@resend.dev>";

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
}

/**
 * Send email to multiple recipients in batches of 50.
 * Returns the count of emails successfully queued.
 */
export async function sendBatchEmails({
  to,
  subject,
  html,
}: SendEmailParams): Promise<number> {
  if (to.length === 0) return 0;

  const resend = getResendClient();
  let sentCount = 0;

  for (let i = 0; i < to.length; i += BATCH_SIZE) {
    const batch = to.slice(i, i + BATCH_SIZE);

    const emails = batch.map((email) => ({
      from: FROM_ADDRESS,
      to: email,
      subject,
      html,
    }));

    const { error } = await resend.batch.send(emails);

    if (!error) {
      sentCount += batch.length;
    }
  }

  return sentCount;
}
