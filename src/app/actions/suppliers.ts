// src/app/actions/suppliers.ts
"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { getOrgId } from "@/lib/org-helpers";

export type Supplier = {
  id?: string;
  org_id?: string;
  supplier_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  item_types: string[] | null; // e.g., ["Meat","Dairy"]
  notes: string | null;
  active: boolean;
  created_at?: string;
};

export type SupplierInput = {
  id?: string;
  supplier_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  item_types?: string[] | null;
  notes?: string | null;
  active?: boolean;
};

export async function listSuppliers(): Promise<Supplier[]> {
  const orgId = await getOrgId();
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Supplier[];
}

export async function upsertSupplier(input: SupplierInput) {
  const orgId = await getOrgId();
  const supabase = await supabaseServer();

  const payload: Supplier = {
    id: input.id,
    org_id: orgId,
    supplier_name: input.supplier_name.trim(),
    contact_name: (input.contact_name ?? null) || null,
    contact_email: (input.contact_email ?? null) || null,
    contact_phone: (input.contact_phone ?? null) || null,
    item_types: input.item_types?.length ? input.item_types : null,
    notes: (input.notes ?? null) || null,
    active: input.active ?? true,
  };

  const { error } = await supabase.from("suppliers").upsert(payload);
  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/suppliers");
  return { ok: true as const };
}

export async function deleteSupplier(id: string) {
  const orgId = await getOrgId();
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("org_id", orgId)
    .eq("id", id);

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/suppliers");
  return { ok: true as const };
}
