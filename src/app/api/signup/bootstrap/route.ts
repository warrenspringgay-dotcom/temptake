// src/app/api/signup/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureOrgForCurrentUser } from "@/lib/ensureOrg";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      ownerName?: string;
      businessName?: string;
    };

    const result = await ensureOrgForCurrentUser({
      ownerName: body.ownerName,
      businessName: body.businessName,
    });

    if (!result.ok) {
      const status = result.reason === "no-auth" ? 401 : 500;
      return NextResponse.json(
        { ok: false, reason: result.reason },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      orgId: result.orgId,
      locationId: result.locationId ?? null,
    });
  } catch (err) {
    console.error("[api/signup/bootstrap] exception", err);
    return NextResponse.json(
      { ok: false, reason: "exception" },
      { status: 500 }
    );
  }
}
