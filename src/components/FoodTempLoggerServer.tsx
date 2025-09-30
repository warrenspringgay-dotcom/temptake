// src/components/FoodTempLoggerServer.tsx
// Server component (no "use client")
import FoodTempLogger from "./FoodTempLogger";
import { supabaseServer } from "@/lib/supabaseServer";

type TeamRow = {
  initials?: string | null;
  name?: string | null;
  email?: string | null;
  [k: string]: any;
};

export const dynamic = "force-dynamic";

export default async function FoodTempLoggerServer() {
  const sb = await supabaseServer();

  // Get the current user id (if signed in)
  const { data: userData } = await sb.auth.getUser();
  const uid = userData.user?.id ?? null;

  // Build initials list in a schema-agnostic way
  let initials: string[] = [];
  if (uid) {
    // try several common owner columns so it works with your `uid` column too
    const ownerCols = ["created_by", "user_id", "uid", "owner_id", "org_id"] as const;

    let team: TeamRow[] = [];
    for (const col of ownerCols) {
      const { data, error } = await sb.from("team_members").select("*").eq(col, uid);
      if (!error) {
        team = data ?? [];
        if (team.length) break;
      }
    }
    // last resort: no filter (useful in dev)
    if (!team.length) {
      const { data } = await sb.from("team_members").select("*");
      team = data ?? [];
    }

    const list = Array.from(
      new Set(
        (team || [])
          .map((r) => {
            if (r.initials) return String(r.initials).toUpperCase();
            if (r.name) return String(r.name)[0]?.toUpperCase();
            if (r.email) return String(r.email)[0]?.toUpperCase();
            return null;
          })
          .filter((x): x is string => Boolean(x))
      )
    );

    initials = list;
  }

  // Render the client component with the initials we found
  return <FoodTempLogger initials={initials} />;
}
