"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type Supplier = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  // optional: keep if you show tags in the UI; we just pass them through
  types?: string[] | null;
};

/** Get current user + their org_id from profiles. */
async function getOrgId() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error("Not signed in.");

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) throw profErr;
  if (!prof?.org_id) throw new Error("No org_id on profile.");
  return { supabase, userId: user.id, orgId: prof.org_id as string };
}

/** List suppliers scoped to current org. */
export async function listSuppliers(): Promise<Supplier[]> {
  const { supabase, orgId } = await getOrgId();

  // Minimal fields that are guaranteed to exist.
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, email, phone, notes") // add more columns if you have them
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    console.error("[suppliers:list] ", error);
    return [];
  }

  // If you later add a junction (suppliers_types), you can fetch and join here.
  return (data ?? []);
}

/** Create/update a supplier (scoped to org). */
export async function upsertSupplier(input: Supplier): Promise<void> {
  const { supabase, orgId } = await getOrgId();

  const payload = {
    id: input.id,
    org_id: orgId,                  // ← IMPORTANT: set org_id
    name: input.name ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    notes: input.notes ?? null,
  };

  // Upsert the supplier row
  const { data: upserted, error } = await supabase
    .from("suppliers")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  if (error) {
    console.error("[suppliers:upsert] ", error);
    throw error;
  }

  // Optionally handle types in a junction table if/when it exists.
  // This block is fully defensive: it silently skips when the table or FK doesn’t exist.
  if (Array.isArray(input.types) && upserted?.id) {
    try {
      // delete existing
      const del = await supabase
        .from("suppliers_types")
        .delete()
        .eq("supplier_id", upserted.id);
      if ((del as any).error) throw (del as any).error;

      // insert new
      if (input.types.length) {
        const rows = input.types.map((t) => ({
          supplier_id: upserted.id,
          org_id: orgId,
          type: t,
        }));
        const ins = await supabase.from("suppliers_types").insert(rows);
        if ((ins as any).error) throw (ins as any).error;
      }
    } catch (e) {
      // Table not there yet / no relationship – ignore gracefully
      console.warn("[suppliers:upsert types skipped]", e);
    }
  }

  revalidatePath("/suppliers");
}

/** Delete supplier (scoped to org). */
export async function deleteSupplier(id: string): Promise<void> {
  const { supabase, orgId } = await getOrgId();

  // Best effort delete types first if the table exists.
  try {
    await supabase.from("suppliers_types").delete().eq("supplier_id", id).eq("org_id", orgId);
  } catch {
    /* ignore if table missing */
  }

  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);

  if (error) {
    console.error("[suppliers:delete] ", error);
    throw error;
  }

  revalidatePath("/suppliers");
}
