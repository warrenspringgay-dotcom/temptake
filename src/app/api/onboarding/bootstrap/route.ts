// src/app/api/onboarding/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
* Supabase PostgREST will throw:
*  - PGRST204: "Could not find the '<col>' column of '<table>' in the schema cache"
*
* Your schemas clearly differ between environments / iterations,
* so we progressively drop unknown fields and retry.
*/
async function tolerantInsert<T extends Record<string, any>>(opts: {
  table: string;
  row: T;
  select?: string; // default "id"
}) {
  const table = opts.table;
  const select = opts.select ?? "id";

  // We mutate a working copy as we remove bad fields.
  const working: Record<string, any> = { ...opts.row };

  // Safety valve: don’t loop forever.
  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .insert(working as any)
      .select(select)
      .single();

    if (!error) return { data, removed: [] as string[] };

    const msg = String((error as any)?.message ?? "");
    const code = String((error as any)?.code ?? "");

    // Only handle “unknown column” type errors.
    if (code !== "PGRST204") {
      throw error;
    }

    // Try to extract the column name from the error message.
    // Example: "Could not find the 'active' column of 'orgs' in the schema cache"
    const m = msg.match(/Could not find the '([^']+)' column/i);
    const badCol = m?.[1];

    if (!badCol || !(badCol in working)) {
      // If we can’t parse it, don’t guess.
      throw error;
    }

    delete working[badCol];
    // loop and retry with that field removed
  }

  throw new Error(`tolerantInsert exceeded retries for table ${opts.table}`);
}

async function tolerantUpsert<T extends Record<string, any>>(opts: {
  table: string;
  row: T;
  onConflict: string;
  select?: string; // default "id"
}) {
  const table = opts.table;
  const onConflict = opts.onConflict;
  const select = opts.select ?? "id";

  const working: Record<string, any> = { ...opts.row };

  for (let i = 0; i < 20; i++) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .upsert(working as any, { onConflict })
      .select(select)
      .single();

    if (!error) return { data, removed: [] as string[] };

    const msg = String((error as any)?.message ?? "");
    const code = String((error as any)?.code ?? "");

    if (code !== "PGRST204") {
      throw error;
    }

    const m = msg.match(/Could not find the '([^']+)' column/i);
    const badCol = m?.[1];

    if (!badCol || !(badCol in working)) {
      throw error;
    }

    delete working[badCol];
  }

  throw new Error(`tolerantUpsert exceeded retries for table ${opts.table}`);
}

function deriveInitials(nameOrEmail: string) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "ME";

  if (s.includes("@")) {
    const local = s.split("@")[0] ?? "";
    return local.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || "ME";
  }

  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase().slice(0, 4);
}

async function getUserFromRequest(req: NextRequest) {
  const supabase = await getServerSupabase();

  // 1) cookie session
  const { data: cookieAuth, error: cookieErr } = await supabase.auth.getUser();
  if (!cookieErr && cookieAuth?.user) return cookieAuth.user;

  // 2) bearer token fallback (immediately after signup)
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (token) {
    const { data: tokenAuth, error: tokenErr } = await supabase.auth.getUser(token);
    if (!tokenErr && tokenAuth?.user) return tokenAuth.user;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ ok: false, reason: "no-auth" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as any;
    const ownerName = String(body.ownerName ?? "").trim();
    const businessName = String(body.businessName ?? "").trim();
    const locationName = String(body.locationName ?? "").trim();

    const email = (user.email ?? "").trim().toLowerCase();
    const displayName = ownerName || (email ? email.split("@")[0] : "Owner");
    const initials = deriveInitials(displayName || email);

    // ========== 1) Create ORG (your orgs table is only: id, name, created_at) ==========
    // Only send `name`. Anything else is fake news.
    const orgName = businessName || "My Business";

    const { data: orgRow } = await tolerantInsert({
      table: "orgs",
      row: { name: orgName },
      select: "id",
    });

    const orgId = String((orgRow as any).id);

    // ========== 2) Link user to org (if you have user_orgs) ==========
    // This was throwing 500s earlier. We’ll upsert the bare minimum.
    // If your table name/columns differ, tolerantUpsert will strip unknown columns,
    // but if the table flat-out doesn’t exist you’ll get a real error (as you should).
    try {
      await tolerantUpsert({
        table: "user_orgs",
        row: {
          user_id: user.id,
          org_id: orgId,
        },
        onConflict: "user_id,org_id",
        select: "org_id",
      });
    } catch (e) {
      // Don’t brick the whole signup if this linking table is optional in your setup.
      console.error("[onboarding/bootstrap] user_orgs upsert failed", e);
    }

    // ========== 3) Ensure a LOCATION ==========
    // Try: create location if a name was provided; otherwise create "Main Location".
    // Again: we avoid guessing columns like active unless they exist.
    const locName = locationName || businessName || "Main Location";

    const { data: locRow } = await tolerantInsert({
      table: "locations",
      row: {
        org_id: orgId,
        name: locName,
        // include common fields, but tolerantInsert will remove if they don't exist
        active: true,
      },
      select: "id",
    });

    const locationId = String((locRow as any).id);

    // ========== 4) Upsert OWNER in team_members for that location ==========
    // Your earlier screenshots show location_id + user_id exist (and you want them populated).
    // We include a few likely columns; tolerantUpsert strips any that don't exist.
    await tolerantUpsert({
      table: "team_members",
      row: {
        org_id: orgId,
        location_id: locationId,
        user_id: user.id,
        email: email || null,
        name: displayName,
        initials,
        role: "owner",
        active: true,
        login_enabled: true,
      },
      onConflict: "org_id,location_id,user_id",
      select: "user_id",
    });


    
    // ========== 5) Update profile context (optional) ==========
    // If profiles table has these columns, great; if not, tolerantUpsert strips.
    try {
      await tolerantUpsert({
        table: "profiles",
        row: {
          id: user.id,
          org_id: orgId,
          full_name: ownerName || null,
          active_location_id: locationId,
        },
        onConflict: "id",
        select: "id",
      });
    } catch (e) {
      console.error("[onboarding/bootstrap] profiles upsert failed", e);
    }

    // ========== 6) Set cookies for immediate app context ==========
    const res = NextResponse.json({ ok: true, orgId, locationId }, { status: 200 });

    res.cookies.set("tt_active_org", orgId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    res.cookies.set("tt_active_location", locationId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
    });

    return res;
  } catch (err: any) {
    console.error("[onboarding/bootstrap] unexpected error", err);
    return NextResponse.json(
      { ok: false, reason: "exception", detail: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
