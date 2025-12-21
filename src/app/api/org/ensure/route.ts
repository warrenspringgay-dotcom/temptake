// src/app/api/org/ensure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { ownerName, businessName, locationName } = body ?? {};

    const result = await ensureOrgForCurrentUser({
      ownerName: typeof ownerName === "string" ? ownerName : undefined,
      businessName:
        typeof businessName === "string" ? businessName : undefined,
      locationName:
        typeof locationName === "string" ? locationName : undefined,
    });

    // ensureOrgForCurrentUser already returns { ok: true/false, ... }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/org/ensure] unexpected error", err);
    return NextResponse.json(
      { ok: false, reason: "server-error" },
      { status: 500 }
    );
  }
}
