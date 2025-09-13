// src/app/actions/presets.ts
"use server";

import { revalidatePath } from "next/cache";

export type Preset = {
  id: string;
  key: string;
  label: string;
  minC: number | null;
  maxC: number | null;
  sort?: number;
};

// In this local-first build, presets are static (use your existing constants in lib/temp-constants).
// These server actions are no-ops that keep the build happy and the API stable.

export async function listPresets(): Promise<Preset[]> {
  // If you later want to fetch from a DB, do it here.
  return [];
}

export async function upsertPreset(_preset: Omit<Preset, "id"> & { id?: string }) {
  // No-op for now; add DB write later.
  revalidatePath("/dashboard");
}

export async function deletePreset(_id: string) {
  // No-op for now; add DB delete later.
  revalidatePath("/dashboard");
}
