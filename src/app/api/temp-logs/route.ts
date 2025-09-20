// src/app/api/temp-logs/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrgId } from "@/lib/org-helpers"; // ✅ single source of truth

const isUuid = (v: unknown) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || "");

/** GET /api/temp-logs -> latest rows for the current org */
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const org_id = await getOrgId();

    const { data, error } = await supabase
      .from("temp_logs")
      .select("id,date,created_at,staff_initials,location,item,target_key,temp_c,org_id")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}

/** POST /api/temp-logs -> insert/upsert one row */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = await supabaseServer();
    const org_id = await getOrgId();

    // Clean undefined / string "null"
    const clean = (v: any) => (v === undefined || v === "null" ? null : v);

    const row: any = {
      org_id,
      date: clean(body.date),
      staff_initials: clean(body.staff_initials),
      location: clean(body.location),
      item: clean(body.item),
      target_key: clean(body.target_key),
      temp_c: body.temp_c ?? null,
    };
    if (isUuid(body.id)) row.id = body.id;

    const query = isUuid(row.id)
      ? supabase.from("temp_logs").upsert(row, { onConflict: "id" }).select("id").single()
      : supabase.from("temp_logs").insert(row).select("id").single();

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 400 });
  }
}

/** DELETE /api/temp-logs?id=<uuid> -> delete one row for this org */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !isUuid(id)) {
      return NextResponse.json({ ok: false, error: "Valid id (uuid) required" }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const org_id = await getOrgId();

    const { error } = await supabase.from("temp_logs").delete().eq("id", id).eq("org_id", org_id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 400 });
  }
}
