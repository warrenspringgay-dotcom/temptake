import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json(
    { user: user ? { id: user.id, email: user.email ?? null } : null },
    { status: 200 }
  );
}
