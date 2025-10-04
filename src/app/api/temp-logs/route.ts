import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("food_temp_logs")
    .select("*")
    .order("at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
