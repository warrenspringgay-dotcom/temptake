// src/app/api/suppliers/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Map incoming/outgoing shapes to keep the UI simple.
type SupplierRow = {
  id: string;
  org_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  types_json: string[] | null;     // stored in DB
};

function toClient(r: SupplierRow) {
  return {
    id: r.id,
    name: r.name ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    notes: r.notes ?? "",
    types: Array.isArray(r.types_json) ? r.types_json : [],
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id,org_id,name,email,phone,notes,types_json")
    .order("name", { ascending: true });

  if (error) {
    console.error("[suppliers:list] ", error);
    return NextResponse.json([], { status: 200 }); // keep UI resilient
  }

  return NextResponse.json((data ?? []).map(toClient));
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  // who’s calling?
  const { data: { user } } = await supabase.auth.getUser();

  // attempt to find org for this user (fallback to user id if your schema uses that)
  let org_id: string | null = null;
  if (user?.id) {
    const prof = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!prof.error) org_id = (prof.data as any)?.org_id ?? null;
    if (!org_id) org_id = user.id; // fallback if your column is user-owned
  }

  const body = await req.json().catch(() => ({}));
  const payload = {
    id: body.id || undefined,        // let DB generate when not provided
    org_id,                          // NOT NULL in your DB – set from profile/user
    name: body.name ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    notes: body.notes ?? null,
    types_json: Array.isArray(body.types) ? body.types : [],
  };

  const { error } = await supabase
    .from("suppliers")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    console.error("[suppliers:upsert] ", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) {
    console.error("[suppliers:delete] ", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
