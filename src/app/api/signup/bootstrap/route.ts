// src/app/api/signup/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { ownerName?: string; businessName?: string }
      | null;

    const ownerName = body?.ownerName ?? "";
    const businessName = body?.businessName ?? "";

    const result = await ensureOrgForCurrentUser({
      ownerName,
      businessName,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[signup/bootstrap] unexpected error", err);
    return NextResponse.json(
      { ok: false as const, reason: "exception" },
      { status: 500 }
    );
  }
}
