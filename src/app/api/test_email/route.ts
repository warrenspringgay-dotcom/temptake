import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function GET() {
  await sendEmail({
    to: "warrenspringgay@gmail.com",
    subject: "TempTake test email",
    html: "<p>Test email works.</p>",
  });

  return NextResponse.json({ ok: true });
}
