// src/app/api/temp-logs/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrgId } from "@/lib/org-helpers";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const org_id = await getOrgId();
    if (!org_id) return NextResponse.json({ data: [] });

    const { data, error } = await supabase
      .from("temp_logs")
      .select("id,date,created_at,staff_initials,location,item,target_key,temp_c,org_id")
      .eq("org_id", org_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to list temp logs", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const org_id = await getOrgId();
    if (!org_id) return new NextResponse("No org", { status: 400 });

    const body = await req.json();
    const row: any = {
      org_id,
      date: body.date ?? null,
      staff_initials: body.staff_initials ?? null,
      location: body.location ?? null,
      item: body.item ?? null,
      target_key: body.target_key ?? null,
      temp_c: body.temp_c ?? null,
    };
    if (body.id) row.id = body.id;

    const q = row.id
      ? supabase.from("temp_logs").upsert(row, { onConflict: "id" }).select("id").single()
      : supabase.from("temp_logs").insert(row).select("id").single();

    const { error } = await q;
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to upsert temp log", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await supabaseServer();
    const org_id = await getOrgId();
    if (!org_id) return new NextResponse("No org", { status: 400 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const { error } = await supabase.from("temp_logs").delete().eq("id", id).eq("org_id", org_id);
    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return new NextResponse(e?.message || "Failed to delete temp log", { status: 500 });
  }
}
