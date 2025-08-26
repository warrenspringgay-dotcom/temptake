"use server";

import { supabase, supabaseEnabled } from "@/lib/supabase";

/* Types matching your components */
export type TempLogInput = {
  timeISO: string;
  item: string;
  tempC: number;
  device?: string;
  notes?: string;
  organisation_id?: string | null;
};

export async function upsertTempLog(input: TempLogInput) {
  if (!supabaseEnabled) return { ok: false, reason: "disabled" as const };
  const { error } = await supabase
    .from("temp_logs")
    .insert({
      time_iso: input.timeISO,
      item: input.item,
      temp_c: input.tempC,
      device: input.device ?? null,
      notes: input.notes ?? null,
      organisation_id: input.organisation_id ?? null,
    });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

/* Suppliers */
export type SupplierInput = {
  name: string;
  categories: string[];
  contact?: string;
  phone?: string;
  email?: string;
  docAllergen?: string | null;
  docHaccp?: string | null;
  docInsurance?: string | null;
  reviewEveryDays?: number;
  notes?: string;
  organisation_id?: string | null;
};

export async function upsertSupplier(input: SupplierInput) {
  if (!supabaseEnabled) return { ok: false, reason: "disabled" as const };
  const { error } = await supabase.from("suppliers").insert({
    name: input.name,
    categories: input.categories,
    contact: input.contact ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    doc_allergen: input.docAllergen ?? null,
    doc_haccp: input.docHaccp ?? null,
    doc_insurance: input.docInsurance ?? null,
    review_every_days: input.reviewEveryDays ?? null,
    notes: input.notes ?? null,
    organisation_id: input.organisation_id ?? null,
  });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

/* Allergen item + flags */
export type AllergenFlags = Record<
  "gluten" | "crustaceans" | "eggs" | "fish" | "peanuts" | "soybeans" | "milk" |
  "nuts" | "celery" | "mustard" | "sesame" | "sulphites" | "lupin" | "molluscs", boolean
>;

export type AllergenItemInput = {
  name: string;
  category?: string;
  notes?: string;
  flags: AllergenFlags;
  locked?: boolean;
  organisation_id?: string | null;
};

export async function upsertAllergenItem(input: AllergenItemInput) {
  if (!supabaseEnabled) return { ok: false, reason: "disabled" as const };
  const { data, error } = await supabase.from("allergen_items")
    .insert({
      name: input.name,
      category: input.category ?? null,
      notes: input.notes ?? null,
      locked: !!input.locked,
      organisation_id: input.organisation_id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, reason: error?.message ?? "no id" };

  const flags = Object.entries(input.flags)
    .filter(([, v]) => typeof v === "boolean")
    .map(([key, value]) => ({ item_id: data.id, key, value }));

  if (flags.length) {
    const { error: fErr } = await supabase.from("allergen_flags").insert(flags);
    if (fErr) return { ok: false as const, reason: fErr.message };
  }

  return { ok: true as const };
}
