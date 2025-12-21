// src/app/api/org/ensure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase as createServerSupabaseClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function initialsFromName(name?: string | null, email?: string | null): string {
  const n = (name ?? "").trim();
  if (n) {
    const parts = n.split(/\s+/);
    const first = parts[0][0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
    const combo = (first + last || first).toUpperCase();
    if (combo) return combo;
  }

  const e = (email ?? "").trim();
  if (e) return e[0].toUpperCase();
  return "U"; // worst-case fallback so NOT NULL is always satisfied
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, reason: "no-auth" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const email = user.email ?? null;

    let ownerName: string | null = null;
    let businessName: string | null = null;

    try {
      const body = await req.json();
      ownerName = (body?.ownerName ?? "").trim() || null;
      businessName = (body?.businessName ?? "").trim() || null;
    } catch {
      // no body / invalid JSON → fine, we just fall back to defaults
    }

    const orgName = businessName || "My Business";

    // 1) Reuse existing mapping if it exists
    let orgId: string | null = null;

    const { data: mapping, error: mappingErr } = await supabaseAdmin
      .from("user_orgs")
      .select("org_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mappingErr && mapping?.org_id) {
      orgId = String(mapping.org_id);
    }

    // 2) If no org yet, create one
    if (!orgId) {
      const { data: orgRow, error: orgErr } = await supabaseAdmin
        .from("orgs")
        .insert({ name: orgName })
        .select("id")
        .single();

      if (orgErr || !orgRow?.id) {
        console.error("[ensureOrg] org create failed", orgErr);
        return NextResponse.json(
          { ok: false, reason: "org-create-failed" },
          { status: 500 }
        );
      }

      orgId = String(orgRow.id);
    }

    // 3) Ensure user_orgs mapping (one org per user)
    const { error: uoErr } = await supabaseAdmin
      .from("user_orgs")
      .upsert(
        {
          user_id: userId,
          org_id: orgId,
          role: "owner",
          active: true,
        },
        { onConflict: "user_id" }
      );

    if (uoErr) {
      console.error("[ensureOrg] user_orgs upsert failed", uoErr);
      return NextResponse.json(
        { ok: false, reason: "user-orgs-upsert-failed" },
        { status: 500 }
      );
    }

    // 4) Ensure profile row (with org_id + full_name)
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          org_id: orgId,
          role: "owner",
          full_name: ownerName,
        },
        { onConflict: "id" }
      );

    if (profileErr) {
      console.error("[ensureOrg] profile upsert failed", profileErr);
      return NextResponse.json(
        { ok: false, reason: "profile-upsert-failed" },
        { status: 500 }
      );
    }

    // 5) Ensure a default LOCATION for this org
    let locationId: string | null = null;

    const { data: existingLoc, error: locLookupErr } = await supabaseAdmin
      .from("locations")
      .select("id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true })
      .maybeSingle();

    if (!locLookupErr && existingLoc?.id) {
      locationId = String(existingLoc.id);
    } else {
      const { data: locRow, error: locErr } = await supabaseAdmin
        .from("locations")
        .insert({
          org_id: orgId,
          name: orgName, // 👈 business name becomes default location name
          active: true,
        })
        .select("id")
        .single();

      if (locErr || !locRow?.id) {
        console.error("[ensureOrg] location create failed", locErr);
        // not fatal, but tell the client
      } else {
        locationId = String(locRow.id);
      }
    }

    // 6) Ensure OWNER team member record
    if (email) {
      const { data: tmRow, error: tmLookupErr } = await supabaseAdmin
        .from("team_members")
        .select("id")
        .eq("org_id", orgId)
        .eq("email", email)
        .maybeSingle();

      if (!tmLookupErr && !tmRow) {
        const initials = initialsFromName(ownerName, email);

        const { error: tmInsertErr } = await supabaseAdmin
          .from("team_members")
          .insert({
            org_id: orgId,
            name: ownerName || email,
            email,
            role: "owner",
            active: true,
            initials, // 👈 avoids NOT NULL error
          } as any);

        if (tmInsertErr) {
          console.error("[ensureOrg] team_members insert failed", tmInsertErr);
          // again, not fatal to the whole signup
        }
      }
    }

    return NextResponse.json({
      ok: true,
      orgId,
      locationId,
    });
  } catch (err) {
    console.error("[ensureOrg] unhandled error", err);
    return NextResponse.json(
      { ok: false, reason: "unhandled-error" },
      { status: 500 }
    );
  }
}
