// src/app/actions/suppliers.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

export type Supplier = {
  id: string;
  org_id: string;              // ✅ required
  supplier_name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  notes: string | null;
  created_at?: string;
};

export async function listSuppliers(): Promise<Supplier[]> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orgId = user.id; // TODO: replace with real org_id lookup if you have orgs

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("org_id", orgId)
    .order("supplier_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Supplier[]) ?? [];
}

export async function upsertSupplier(input: {
  id: string;
  supplier_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  notes?: string | null;
}) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orgId = user.id; // TODO: replace with real org_id lookup if you have orgs
  if (!orgId) {
    throw new Error("Missing org_id for supplier create/update");
  }

  const payload: Supplier = {
    id: input.id,
    org_id: orgId, // ✅ guaranteed string
    supplier_name: input.supplier_name.trim(),
    contact_name: input.contact_name ?? null,
    contact_email: input.contact_email ?? null,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
  };

  const { error } = await supabase.from("suppliers").upsert(payload);
  if (error) throw new Error(error.message);

  return payload;
}

export async function deleteSupplier(id: string) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orgId = user.id; // TODO: replace with real org_id lookup if you have orgs
  if (!orgId) {
    throw new Error("Missing org_id for supplier delete");
  }

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);
}
