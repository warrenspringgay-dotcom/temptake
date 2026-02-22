import { NextResponse } from "next/server";

// Minimal endpoint to satisfy the WorkstationLockProvider.
// If you later want server-side persistence (db), this is where it goes.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, received: body });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}