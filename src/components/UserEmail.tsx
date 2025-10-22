// "use client" NOT present: server component
import { getServerSupabase } from "@/lib/supabaseServer";

export default async function UserEmail() {
  const sb = await getServerSupabase();
  const { data } = await sb.auth.getUser();
  const email = data?.user?.email ?? null;
  if (!email) return null;
  return <span className="text-sm text-gray-600 mr-2">{email}</span>;
}
