"use server";

import { supabaseServer } from "@/lib/supabase";

// ---------- SUPPLIERS ----------
export async function upsertSupplier(supplier: {
  id?: string;
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
}) {
  const sb = supabaseServer();
  const { data, error } = await sb.from("suppliers").upsert(supplier).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(id: string) {
  const sb = supabaseServer();
  await sb.from("suppliers").delete().eq("id", id);
}

// ---------- TEAM ----------
export async function upsertStaff(staff: {
  id?: string;
  initials: string;
  name: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
}) {
  const sb = supabaseServer();
  const { data, error } = await sb.from("staff").upsert(staff).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStaff(id: string) {
  const sb = supabaseServer();
  await sb.from("staff").delete().eq("id", id);
}

export async function upsertTraining(training: {
  id?: string;
  staff_id: string;
  type: string;
  awarded_on: string;
  expires_on: string;
  certificate_url?: string;
  notes?: string;
}) {
  const sb = supabaseServer();
  const { data, error } = await sb.from("trainings").upsert(training).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTraining(id: string) {
  const sb = supabaseServer();
  await sb.from("trainings").delete().eq("id", id);
}