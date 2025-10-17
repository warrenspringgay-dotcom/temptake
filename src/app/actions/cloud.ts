"use server";
import { getServerSupabase } from "@/lib/supabaseServer";

export default async function Page() {
  const supabase = await getServerSupabase();
  // ...
}


/* If you had anything like:
export async function someAction(...) {
  const supabase = await ServerSupabase();
  ...
}
…convert it to: */
export async function someAction(/* args */) {

  const supabase = await getServerSupabase();
  // ... your logic
}
