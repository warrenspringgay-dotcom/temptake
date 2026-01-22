// src/lib/email.ts
import "server-only";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM = process.env.EMAIL_FROM || "TempTake <info@temptake.com>";

// IMPORTANT:
// Do NOT throw at module load time.
// Next.js may evaluate this during build/route collection.
// Missing env should NOT crash your build.
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  // If you're missing config, silently no-op (and log once).
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing - email skipped", { to, subject });
    return { skipped: true };
  }

  if (!to?.trim()) {
    console.warn("[email] Missing recipient - email skipped", { subject });
    return { skipped: true };
  }

  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}
