// src/app/api/signup/bootstrap/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  // Authenticated (RLS) client using cookies
  const supabase = createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });

  // Admin client (service role) for writes that may need elevated permissions
  const admin = createClient(url, service);

  const {
    orgName,
    locationName,
    ownerName,
    ownerInitials,
    ownerEmail,
  }: {
    orgName?: string;
    locationName?: string;
    ownerName?: string;
    ownerInitials?: string;
    ownerEmail?: string;
  } = await req.json().catch(() => ({}));

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  }

  const safeOrgName = String(orgName || "My Organisation").trim() || "My Organisation";
  const safeLocationName = String(locationName || "Main Location").trim() || "Main Location";
  const safeOwnerName = String(ownerName || user.email || "Owner").trim() || "Owner";
  const safeInitials = String(ownerInitials || "").trim().toUpperCase() || "ME";
  const safeEmail = String(ownerEmail || user.email || "").trim() || null;

  // 1) Create org
  const { data: orgRow, error: orgErr } = await admin
    .from("orgs")
    .insert({ name: safeOrgName, created_by: user.id })
    .select("id")
    .single();

  if (orgErr || !orgRow?.id) {
    return NextResponse.json(
      { ok: false, reason: "org_create_failed", error: orgErr?.message },
      { status: 500 }
    );
  }

  // 2) Create location
  const { data: locRow, error: locErr } = await admin
    .from("locations")
    .insert({ org_id: orgRow.id, name: safeLocationName, created_by: user.id })
    .select("id")
    .single();

  if (locErr || !locRow?.id) {
    return NextResponse.json(
      { ok: false, reason: "location_create_failed", error: locErr?.message },
      { status: 500 }
    );
  }

  // 3) Create team member for owner (same as you already do)
  const baseTm = {
    org_id: orgRow.id,
    location_id: locRow.id,
    user_id: user.id,
    name: safeOwnerName,
    initials: safeInitials,
    role: "owner",
    email: safeEmail,
    active: true,
    login_enabled: true,
    pin_enabled: true,
    created_by: user.id,
  };

  // Try user_id conflict first (if your schema supports it), then email fallback
  let tmId: string | null = null;

  const { data: tm1, error: tmErr1 } = await admin
    .from("team_members")
    .upsert(baseTm as any, { onConflict: "org_id,location_id,user_id" })
    .select("id")
    .single();

  if (!tmErr1 && tm1?.id) tmId = tm1.id;

  if (!tmId && safeEmail) {
    const { data: tm2, error: tmErr2 } = await admin
      .from("team_members")
      .upsert(baseTm as any, { onConflict: "org_id,location_id,email" })
      .select("id")
      .single();

    if (!tmErr2 && tm2?.id) tmId = tm2.id;
  }

  if (!tmId) {
    return NextResponse.json(
      { ok: false, reason: "team_member_create_failed" },
      { status: 500 }
    );
  }

  // ✅ 4) Set ACTIVE context cookies using the SAME names workstation expects
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set("tt_active_org_id", orgRow.id, {
    path: "/",
    sameSite: "lax",
    secure,
  });

  cookieStore.set("tt_active_location_id", locRow.id, {
    path: "/",
    sameSite: "lax",
    secure,
  });

  return NextResponse.json({
    ok: true,
    orgId: orgRow.id,
    locationId: locRow.id,
    teamMemberId: tmId,
  });
}
