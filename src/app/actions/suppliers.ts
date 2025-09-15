"use server";

import { revalidatePath } from "next/cache";
import { db, requireUserId, getOrgIdSafe } from "@/app/actions/db";

/** Public shape used by the UI */
export type Supplier = {
  id?: string;
  name: string;

  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;

  /** Optional classification (e.g. "Dairy", "Produce", etc.) */
  item_type?: string | null;

  notes?: string | null;

  // metadata that may exist in the DB
  org_id?: string | null;
  created_at?: string;
};

/** Payload accepted by upsert */
export type SupplierInput = {
  id?: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  item_type?: string | null;
  notes?: string | null;
};

/** Some components still import SupplierRow — export an alias for compatibility */
export type SupplierRow = Supplier;

/** Sanitize empty strings to null for nullable columns */
function emptyToNull(v?: string | null) {
  if (v === undefined) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

/** List suppliers for the current org (falls back to user scope if you don’t use orgs). */
export async function listSuppliers(): Promise<Supplier[]> {
  const supabase = await db();
  const userId = await requireUserId();
  const orgId = await getOrgIdSafe();

  // Adjust table/columns if your schema differs.
  // Expected table columns: id, org_id, user_id, name, contact_name, phone, email, item_type, notes, created_at
  let q = supabase.from("suppliers").select("*").order("name", { ascending: true });

  if (orgId) {
    q = q.eq("org_id", orgId);
  } else {
    // If you don't use orgs, filter by the current user so different users don't see each other's data
    q = q.eq("user_id", userId);
  }

  const { data, error } = await q;
  if (error) {
    // Return empty array on error so the UI remains stable
    // You can also console.error in dev:
    // console.error("listSuppliers error:", error);
    return [];
  }

  return (data ?? []) as Supplier[];
}

/** Create or update a supplier */
export async function upsertSupplier(input: SupplierInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await db();
  const userId = await requireUserId();
  const orgId = await getOrgIdSafe();

  const row = {
    id: input.id || undefined,
    name: input.name.trim(),
    contact_name: emptyToNull(input.contact_name),
    phone: emptyToNull(input.phone),
    email: emptyToNull(input.email),
    item_type: emptyToNull(input.item_type),
    notes: emptyToNull(input.notes),
    org_id: orgId ?? null,
    user_id: userId,
  };

  const { error } = await supabase.from("suppliers").upsert(row, { onConflict: "id" }).select("id").single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // Refresh the /suppliers page and any component segments that depend on it
  revalidatePath("/suppliers");
  return { ok: true };
}

/** Delete a supplier by id */
export async function deleteSupplier(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await db();
  const userId = await requireUserId();
  const orgId = await getOrgIdSafe();

  // Scope the delete to org/user to avoid leaking across tenants
  let q = supabase.from("suppliers").delete().eq("id", id);

  if (orgId) {
    q = q.eq("org_id", orgId);
  } else {
    q = q.eq("user_id", userId);
  }

  const { error } = await q;
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/suppliers");
  return { ok: true };
}
