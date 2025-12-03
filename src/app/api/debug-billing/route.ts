// src/app/api/debug-billing-subs/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    envUrl: process.env.SUPABASE_URL,
    rowCount: data?.length ?? 0,
    data,
    error,
  });
}
