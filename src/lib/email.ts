import "server-only";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "TempTake <info@temptake.com>";

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (resend) return resend;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // IMPORTANT:
    // Don't throw at import-time, or Next builds will fail while collecting routes.
    // We only throw when we *actually* try to send an email.
    throw new Error("RESEND_API_KEY is not set");
  }

  resend = new Resend(key);
  return resend;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!to?.trim()) throw new Error("sendEmail: missing 'to'");

  const client = getResendClient();

  return client.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}
