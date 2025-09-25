// src/app/api/team-initials/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrgId } from "@/lib/org-helpers";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const org_id = await getOrgId();

    // Adjust table/column names to your schema:
    // expecting table "team_members" with columns: org_id, initials (or staff_initials)
    const { data, error } = await supabase
      .from("team_members")
      .select("initials")
      .eq("org_id", org_id);

    if (error) throw error;

    const set = new Set<string>();
    for (const r of data ?? []) {
      const v = (r.initials ?? "").toString().trim().toUpperCase();
      if (v) set.add(v);
    }

    return NextResponse.json({ ok: true, data: Array.from(set).sort() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
