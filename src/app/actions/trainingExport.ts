// src/app/actions/trainingExport.ts
"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { getActiveOrgIdServer } from "@/lib/orgServer";

export async function exportHighfieldCsv() {
  const supabase = await getServerSupabase();
  const org_id = await getActiveOrgIdServer();

  const { data, error } = await supabase
    .from("trainings")
    .select(`
      learner_first_name,
      learner_last_name,
      learner_email,
      type,
      status
    `)
    .eq("org_id", org_id)
    .in("status", ["assigned", "invited"]);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((t: any) =>
    [
      t.learner_first_name,
      t.learner_last_name,
      t.learner_email,
      t.type,
    ].join(",")
  );

  const csv =
    "First Name,Last Name,Email,Course\n" +
    rows.join("\n");

  return csv;
}