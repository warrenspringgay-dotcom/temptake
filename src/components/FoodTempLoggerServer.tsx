// src/components/FoodTempLoggerServer.tsx
// Server component that preloads staff initials, then renders the client logger.

import FoodTempLogger from "@/components/FoodTempLogger";
import { createServerClient } from "@/lib/supabaseServer";

export default async function FoodTempLoggerServer() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initials: string[] = [];

  if (user) {
    const { data } = await supabase
      .from("team_members")
      .select("initials")
      .eq("created_by", user.id);

    initials = (data ?? [])
      .map((r: any) => (r?.initials as string) || "")
      .filter(Boolean)
      .map((s) => s.toUpperCase());
  }

  return <FoodTempLogger initials={initials} />;
}
