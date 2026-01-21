import "server-only";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");

const resend = new Resend(RESEND_API_KEY);

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
  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}
