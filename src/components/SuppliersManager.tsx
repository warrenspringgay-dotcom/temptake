"use client";

import React from "react";
import { createClient } from "@supabase/supabase-js";

/** Supabase browser client */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Supplier = {
  id: string;
  name: string;
  categories: string[];
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  docAllergen?: string | null; // ISO date string
  docHaccp?: string | null;    // ISO date string
  docInsurance?: string | null;// ISO date string
  reviewEveryDays?: number | null;
  notes?: string | null;
};

const CATEGORY_OPTIONS = [
  "Produce", "Meat", "Dairy", "Bakery", "Dry Goods", "Beverages", "Seafood", "Other",
] as const;

type ModalState =
  | { open: false }
  | { open: true; mode: "add" | "edit"; supplier?: Supplier };

export default function SuppliersManager() {
  const [rows, setRows] = React.useState<Supplier[]>(