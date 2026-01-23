// src/lib/email.ts
import "server-only";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "TempTake <info@temptake.com>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  // ✅ Do NOT throw at module import time (breaks builds)
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const resend = new Resend(RESEND_API_KEY);

  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}
