// src/app/api/workstation/clear/route.ts
import { NextResponse } from "next/server";
import { clearOperatorCookie } from "@/lib/workstationServer";

export const dynamic = "force-dynamic";

export async function POST() {
await clearOperatorCookie();
  return NextResponse.json({ ok: true });
}