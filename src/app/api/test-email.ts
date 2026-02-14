// /api/test-email

import { Resend } from "resend";

export async function GET() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "info@temptake.com",
    to: "yourpersonalemail@gmail.com",
    subject: "Test",
    html: "<p>Test email</p>",
  });

  return new Response("sent");
}
