import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type LocationRow = {
  id: string;
  org_id: string;
  name: string | null;
};

type OpeningRow = {
  location_id: string;
  closes_at: string | null;
  is_open: boolean | null;
};

const NOTIFICATION_TYPE = "closing_signoff_missing";
const LOOKAHEAD_MINUTES = 45;

function getLondonParts() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const weekday = get("weekday");

  return {
    dateISO: `${yyyy}-${mm}-${dd}`,
    minutesNow: Number(hour) * 60 + Number(minute),
    weekday,
  };
}

function weekdayTo1to7(weekday: string) {
  const key = weekday.toLowerCase();

  if (key === "monday") return 1;
  if (key === "tuesday") return 2;
  if (key === "wednesday") return 3;
  if (key === "thursday") return 4;
  if (key === "friday") return 5;
  if (key === "saturday") return 6;
  if (key === "sunday") return 7;

  return null;
}

function timeToMinutes(t: string | null) {
  if (!t) return null;

  const [hh, mm] = t.slice(0, 5).split(":").map(Number);

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  return hh * 60 + mm;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:info@temptake.com";

  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "Missing VAPID keys." }, { status: 500 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { dateISO, minutesNow, weekday } = getLondonParts();
  const weekdayNum = weekdayTo1to7(weekday);

  if (!weekdayNum) {
    return NextResponse.json({ error: "Could not resolve weekday." }, { status: 500 });
  }

  const { data: openings, error: openingsError } = await supabaseAdmin
    .from("location_opening_days")
    .select("location_id,closes_at,is_open")
    .eq("weekday", weekdayNum)
    .eq("is_open", true);

  if (openingsError) {
    return NextResponse.json({ error: openingsError.message }, { status: 500 });
  }

  const candidateOpeningRows = ((openings ?? []) as OpeningRow[]).filter((row) => {
    const closeMins = timeToMinutes(row.closes_at);
    if (closeMins == null) return false;

    const minutesUntilClose = closeMins - minutesNow;

    return minutesUntilClose >= 0 && minutesUntilClose <= LOOKAHEAD_MINUTES;
  });

  if (candidateOpeningRows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "No locations near closing." });
  }

  const locationIds = candidateOpeningRows.map((r) => r.location_id);

  const { data: locations, error: locationsError } = await supabaseAdmin
    .from("locations")
    .select("id,org_id,name")
    .in("id", locationIds)
    .eq("active", true);

  if (locationsError) {
    return NextResponse.json({ error: locationsError.message }, { status: 500 });
  }

  const locationRows = (locations ?? []) as LocationRow[];

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const location of locationRows) {
    const { data: closure } = await supabaseAdmin
      .from("location_closures")
      .select("id")
      .eq("org_id", location.org_id)
      .eq("location_id", location.id)
      .eq("date", dateISO)
      .maybeSingle();

    if (closure) {
      skipped += 1;
      continue;
    }

    const { data: signoff } = await supabaseAdmin
      .from("daily_signoffs")
      .select("id")
      .eq("org_id", location.org_id)
      .eq("location_id", location.id)
      .eq("signoff_on", dateISO)
      .maybeSingle();

    if (signoff) {
      skipped += 1;
      continue;
    }

    const { error: logInsertError } = await supabaseAdmin.from("notification_log").insert({
      org_id: location.org_id,
      location_id: location.id,
      notification_type: NOTIFICATION_TYPE,
      target_date: dateISO,
    });

    if (logInsertError) {
      skipped += 1;
      continue;
    }

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id,subscription")
      .eq("org_id", location.org_id)
      .eq("enabled", true)
      .or(`location_id.is.null,location_id.eq.${location.id}`);

    if (subError || !subscriptions?.length) {
      skipped += 1;
      continue;
    }

    const payload = JSON.stringify({
      title: "TempTake sign-off reminder",
      body: `${location.name ?? "This location"} has not been signed off and closing time is coming up.`,
      url: "/dashboard",
    });

    for (const row of subscriptions as Array<{ id: string; subscription: any }>) {
      try {
        await webpush.sendNotification(row.subscription, payload);
        sent += 1;
      } catch (e: any) {
        failed += 1;

        const statusCode = Number(e?.statusCode ?? 0);

        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .update({
              enabled: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    failed,
    checked_locations: locationRows.length,
    date: dateISO,
  });
}