// src/app/api/team/suppliers/route.ts
import { NextResponse } from "next/server";
import { db, requireUserId, getOrgIdSafe } from "@/app/actions/db";

/** Keep the shape aligned with your UI/actions */
type SupplierRow = {
  id?: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  item_type?: string | null;
  notes?: string | null;
  org_id?: string | null;
  user_id?: string | null;
  created_at?: string;
};

function emptyToNull(v?: string | null) {
  if (v === undefined) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

/** GET /api/team/suppliers  -> list suppliers (scoped to org or user) */
export async function GET() {
  try {
    const supabase = await db();
    const userId = await requireUserId();
    const orgId = await getOrgIdSafe();

    let q = supabase.from("suppliers").select("*").order("name", { ascending: true });

    if (orgId) {
      q = q.eq("org_id", orgId);
    } else {
      q = q.eq("user_id", userId);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []) as SupplierRow[]);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to list suppliers" }, { status: 500 });
  }
}

/** POST /api/team/suppliers  -> upsert supplier
 * body: { id?, name, contact_name?, phone?, email?, item_type?, notes? }
 */
export async function POST(req: Request) {
  try {
    const supabase = await db();
    const userId = await requireUserId();
    const orgId = await getOrgIdSafe();

    const body = (await req.json()) as Partial<SupplierRow>;
    const name = (body.name ?? "").toString().trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const row = {
      id: body.id || undefined,
      name,
      contact_name: emptyToNull(body.contact_name),
      phone: emptyToNull(body.phone),
      email: emptyToNull(body.email),
      item_type: emptyToNull(body.item_type),
      notes: emptyToNull(body.notes),
      org_id: orgId ?? null,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from("suppliers")
      .upsert(row, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, supplier: data as SupplierRow });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to save supplier" }, { status: 500 });
  }
}

/** DELETE /api/team/suppliers?id=UUID  -> delete supplier */
export async function DELETE(req: Request) {
  try {
    const supabase = await db();
    const userId = await requireUserId();
    const orgId = await getOrgIdSafe();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    let q = supabase.from("suppliers").delete().eq("id", id);
    if (orgId) {
      q = q.eq("org_id", orgId);
    } else {
      q = q.eq("user_id", userId);
    }

    const { error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to delete supplier" }, { status: 500 });
  }
}

// Optional: if you want to ensure this route is always dynamic
export const dynamic = "force-dynamic";
