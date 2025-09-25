// src/lib/cloud.ts
"use client";

import { supabase } from "@/lib/supabase";

/** Get current user's id (or null if signed out) */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * TRAINING KPIs (cloud)
 * Returns counts of expired, due soon (≤60d), and total training rows
 * for the current user (RLS will scope rows).
 */
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
    const exp = String(row.expires_on);
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

/**
 * ALLERGEN REVIEW (cloud)
 * Get the single review row for this account (RLS will return 0–1 rows).
 */
export async function getAllergenReview(): Promise<{
  id: string;
  created_by: string;
  last: string | null;
  reviewer: string | null;
  interval_days: number;
  updated_at: string;
} | null> {
  const { data, error } = await supabase
    .from("allergen_review")
    .select("*")
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error; // ignore "no rows"
  return data ?? null;
}

/**
 * Update/create the allergen review row (used in AllergenManager).
 */
export async function setAllergenReview(opts: {
  last: string;            // YYYY-MM-DD
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

/**
 * TEAM INITIALS (cloud)
 * Returns a unique, uppercased, sorted list of initials from team_members.
 */
export async function fetchCloudInitials(): Promise<string[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("initials");

  if (error) throw error;

  const set = new Set<string>();
  for (const r of data ?? []) {
    const v = (r as any).initials ? String((r as any).initials).toUpperCase() : "";
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}
