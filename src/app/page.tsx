// src/app/page.tsx (Server Component)
import { createServerClient } from "@/lib/supabaseServer";  // ⬅️ add this
import FoodTempLoggerServer from "@/components/FoodTempLoggerServer";

export default async function Page() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser(); // ⬅️ remove the extra "{"

  // Seed values for the client component (initials + locations)
  const { data: tm } = await supabase
    .from("team_members")
    .select("initials,name,email");

  const initials = Array.from(
    new Set(
      (tm ?? [])
        .map(
          (r: any) =>
            r.initials?.toString().toUpperCase() ||
            (r.name || "").trim().charAt(0).toUpperCase() ||
            (r.email || "").trim().charAt(0).toUpperCase()
        )
        .filter(Boolean)
    )
  );

  const { data: locs } = await supabase
    .from("food_temp_logs")
    .select("area,location");

  const locations = Array.from(
    new Set(
      (locs ?? [])
        .map((r: any) => (r.area ?? r.location ?? "").toString().trim())
        .filter(Boolean)
    )
  );

  return (
    <main className="p-4">
      <FoodTempLoggerServer initials={initials} locations={locations} />
    </main>
  );
}
