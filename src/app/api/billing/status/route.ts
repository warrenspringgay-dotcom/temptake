import { NextResponse } from "next/server";
import { getSubscriptionForCurrentUser } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  const info = await getSubscriptionForCurrentUser();

  return NextResponse.json(
    {
      loggedIn: info.loggedIn,
      active: info.active,
      status: info.status,
      currentPeriodEnd: info.currentPeriodEnd,
      // keep compatibility with your existing hook usage
      hasValid: info.active,
    },
    { status: 200 }
  );
}
