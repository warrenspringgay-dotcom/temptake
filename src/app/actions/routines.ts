// src/app/actions/routines.ts
export async function listRoutines() {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("temp_routines")
    .select("id, name, created_by, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveRoutineWithItems(
  routine: { name: string },
  items: Array<{ location: string; item: string; target_key: string }>
) {
  const supabase = await createServerClient();

  // 1) create routine
  const { data: r, error: rErr } = await supabase
    .from("temp_routines")
    .insert({ name: routine.name })
    .select("id")
    .single();
  if (rErr) throw rErr;

  // 2) upsert items (unique on routine_id+location+item+target_key)
  const rows = items.map(i => ({ routine_id: r.id, ...i }));
  const { error: iErr } = await supabase
    .from("temp_routine_items")
    .upsert(rows, { onConflict: "routine_id,location,item,target_key" });
  if (iErr) throw iErr;

  return r.id;
}
