// src/app/api/team/suppliers/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

// GET /api/team/suppliers
export async function GET() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id,name,contact_name,phone,email,product_type,notes")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/team/suppliers
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const body = await req.json().catch(() => ({}));

  const row = {
    id: body.id ?? undefined,
    name: String(body.name ?? "").trim(),
    contact_name: body.contact_name ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    product_type: body.product_type ?? null,
    notes: body.notes ?? null,
  };

  let resp;
  if (row.id) {
    const { data, error } = await supabase
      .from("suppliers")
      .update(row)
      .eq("id", row.id)
      .select()
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    resp = data;
  } else {
    const { data, error } = await supabase
      .from("suppliers")
      .insert(row)
      .select()
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    resp = data;
  }

  return NextResponse.json(resp);
}

// DELETE /api/team/suppliers?id=...
export async function DELETE(req: Request) {
  const supabase = await getServerSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
