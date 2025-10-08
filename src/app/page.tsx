// src/app/page.tsx
import FoodTempLoggerServer from "@/components/FoodTempLoggerServer";
import { createServerClient } from "@/lib/supabaseServer";

export default async function Page() {
  const supabase = await createServerClient();

  // ---- initials from team_members (and sensible fallbacks)
  const { data: tm } = await supabase.from("team_members").select("initials,name,email");
  const initials = Array.from(
    new Set(
      (tm ?? []).map((r: any) =>
        (r.initials?.toString().toUpperCase() ||
         (r.name ? r.name.toString().trim()[0] : "") ||
         (r.email ? r.email.toString().trim()[0] : "")
        ).toString().toUpperCase()
      ).filter(Boolean)
    )
  );

  // ---- locations from food_temp_logs.area  (NO 'location' column)
  const { data: logs } = await supabase.from("food_temp_logs").select("area").limit(500);
  const locations = Array.from(
    new Set(
      (logs ?? [])
        .map((r: any) => (r.area ?? "").toString().trim())
        .filter((s: string) => s.length > 0)
    )
  );

  return (
    <main className="p-4">
      <FoodTempLoggerServer initials={initials} locations={locations} />
    </main>
  );
}
