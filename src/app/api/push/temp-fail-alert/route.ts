import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { sendPushToLocation } from "@/lib/push/sendPushToLocation";

export const runtime = "nodejs";

type TempFailBody = {
  orgId?: string;
  locationId?: string;
  failedRows?: Array<{
    id?: string;
    area?: string | null;
    note?: string | null;
    temp_c?: number | null;
    target_key?: string | null;
  }>;
};

export async function POST(req: NextRequest) {
  const sb = await getServerSupabase();

  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json()) as TempFailBody;

  if (!body.orgId || !body.locationId) {
    return NextResponse.json({ error: "Missing orgId or locationId." }, { status: 400 });
  }

  const failedRows = body.failedRows ?? [];

  if (failedRows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 1 });
  }

  const first = failedRows[0];

  const tempLabel =
    first?.temp_c != null && Number.isFinite(Number(first.temp_c))
      ? `${Number(first.temp_c)}°C`
      : "out of range";

  const areaLabel = first?.area ? String(first.area) : "Temperature check";

  const targetDate = new Date().toISOString().slice(0, 10);

  const notificationType = `temperature_fail_${first?.id ?? Date.now()}`;

  const result = await sendPushToLocation({
    orgId: body.orgId,
    locationId: body.locationId,
    notificationType,
    targetDate,
    title: "TempTake temperature alert",
    body: `${areaLabel}: ${tempLabel}. Action required now.`,
    url: "/manager",
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
}