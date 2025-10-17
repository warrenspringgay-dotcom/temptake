// src/lib/cloud.ts
"use client";

import { supabase } from "@/lib/supabaseBrowser";


/** Get current user's id (or null if signed out) */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** TRAINING KPIs (cloud) */
export async function fetchTrainingStats(): Promise<{
  expired: number;
  dueSoon: number;
  total: number;
}> {
  const { data, error } = await supabase
    .from("trainings")
    .select("expires_on")
    .order("expires_on", { ascending: true });

  if (error) throw error;

  const todayISO = new Date().toISOString().slice(0, 10);
  let expired = 0,
    dueSoon = 0,
    total = 0;

  for (const row of data ?? []) {
    total++;
    const exp = String((row as any).expires_on);
    if (exp < todayISO) {
      expired++;
    } else {
      const d = new Date(exp + "T00:00:00Z");
      const now = new Date(todayISO + "T00:00:00Z");
      const diffDays = Math.floor((d.getTime() - now.getTime()) / 86400000);
      if (diffDays <= 60) dueSoon++;
    }
  }
  return { expired, dueSoon, total };
}

/** ALLERGEN REVIEW (cloud) — tolerant: returns null if table/policy missing */
export async function getAllergenReview(): Promise<{
  id: string;
  created_by: string;
  last: string | null;
  reviewer: string | null;
  interval_days: number;
  updated_at: string;
} | null> {
  try {
    const { data, error } = await supabase.from("allergen_review").select("*").maybeSingle();
    if (error && error.code !== "PGRST116") throw error; // ignore "no rows"
    return (data as any) ?? null;
  } catch {
    // If table doesn’t exist / RLS denies, just return null so the dashboard stays up.
    return null;
  }
}

/** Update/create the allergen review row */
export async function setAllergenReview(opts: {
  last: string; // YYYY-MM-DD
  reviewer: string;
  interval_days: number;
}) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("allergen_review")
    .upsert(
      [
        {
          created_by: uid,
          last: opts.last,
          reviewer: opts.reviewer,
          interval_days: opts.interval_days,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "created_by" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** TEAM INITIALS (cloud) */
export async function fetchCloudInitials(): Promise<string[]> {
  const { data, error } = await supabase.from("team_members").select("initials");
  if (error) throw error;
  const set = new Set<string>();
  for (const r of data ?? []) {
    const v = r && (r as any).initials ? String((r as any).initials).toUpperCase() : "";
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}
