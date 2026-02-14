// src/app/api/test-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { ok: false, error: "Missing RESEND_API_KEY" },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const to = url.searchParams.get("to") || "warrenspringgay@gmail.com";

    const resend = new Resend(resendKey);

    const result = await resend.emails.send({
      from: "TempTake <info@temptake.com>",
      to,
      subject: "TempTake test email",
      html: "<p>If you got this, Resend is working.</p>",
    });

    // Resend returns either { data } or { error }
    if ((result as any).error) {
      return NextResponse.json(
        { ok: false, error: (result as any).error },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, to, result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
