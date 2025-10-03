// src/app/actions/suppliers.ts
"use server";

import { createServerClient } from "@/lib/supabaseServer";

export type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  categories: string[] | null;
  is_active: boolean | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function listSuppliers(query?: string): Promise<Supplier[]> {
  const supabase = await createServerClient();
  let q = supabase
    .from("suppliers")
    .select("id,name,contact_name,phone,email,categories,is_active,notes,created_at,updated_at")
    .order("name", { ascending: true });

  if (query && query.trim()) {
    q = q.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Supplier[];
}

export async function upsertSupplier(
  input: Partial<Supplier> & { name: string }
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("suppliers").upsert(input, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteSupplier(id: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.from("suppliers").delete().eq("id", id);
  if (error) throw error;
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id,name,contact_name,phone,email,categories,is_active,notes,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Supplier) ?? null;
}
