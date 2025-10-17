'use server';
import { requireUser } from '@/lib/requireUser';
import { getServerClient } from '@/lib/supabaseServer';

export type LogRow = {
  id: string;
  at: string;
  routine_id: string | null;
  routine_item_id: string | null;
  area: string | null;
  note: string | null;
  target_key: string | null;
  staff_initials: string | null;
  temp_c: number | null;
  status: string | null;
};

export async function listLogs(opts: { from?: string; to?: string; limit?: number } = {}) {
  const sb = await getServerSupabase();
  let q = sb.from('food_temp_logs')
    .select('id,at,routine_id,routine_item_id,area,note,target_key,staff_initials,temp_c,status')
    .order('at', { ascending: false });

  if (opts.from) q = q.gte('at', opts.from);
  if (opts.to) q = q.lte('at', opts.to);
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as LogRow[];
}
