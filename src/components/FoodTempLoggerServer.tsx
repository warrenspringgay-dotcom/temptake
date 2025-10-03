// src/components/FoodTempLoggerServer.tsx
// Server Component: fetches seeds (initials/locations) and renders the client logger.

import { createServerClient } from "@/lib/supabaseServer";
import FoodTempLogger from "./FoodTempLogger";

function firstLetter(s?: string | null) {
  return (s ?? "").trim().charAt(0).toUpperCase();
}

export default async function FoodTempLoggerServer() {
  const supabase = await createServerClient();

  // Seed initials from team_members (fallback to name/email first letter)
  const { data: tm } = await supabase
    .from("team_members")
    .select("initials,name,email");

  const initials = Array.from(
    new Set(
      (tm ?? [])
        .map(
          (r: any) =>
            (r.initials && String(r.initials).toUpperCase()) ||
            firstLetter(r.name) ||
            firstLetter(r.email)
        )
        .filter(Boolean)
    )
  );

  // Seed locations from existing logs (area or location)
  const { data: locs } = await supabase
    .from("food_temp_logs")
    .select("area,location");

  const locations = Array.from(
    new Set(
      (locs ?? [])
        .map((r: any) => String(r.area ?? r.location ?? "").trim())
        .filter(Boolean)
    )
  );

  // Render the client component with seeds
  return <FoodTempLogger initials={initials} locations={locations} />;
}
