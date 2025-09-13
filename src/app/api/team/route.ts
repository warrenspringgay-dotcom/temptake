// Minimal placeholder API so the Team page never 404s.
// Replace with Supabase later. Always returns a safe array.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ items: [] }, { status: 200 });
}

// Optional – accept POSTs to avoid client errors when you wire the form
export async function POST(req: Request) {
  // ignore body for now; just echo back something shaped like a row
  const body = await req.json().catch(() => ({}));
  const row = {
    id: crypto.randomUUID(),
    full_name: body?.full_name ?? "",
    email: body?.email ?? "",
    role: body?.role ?? "member",
    created_at: new Date().toISOString(),
  };
  return NextResponse.json({ ok: true, row }, { status: 200 });
}
