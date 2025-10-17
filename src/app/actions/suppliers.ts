'use server';
import { requireUser } from '@/lib/requireUser';
import { getServerSupabase } from "@/lib/supabaseServer";

export type Supplier = {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  active: boolean;
  categories: string[];
};

export async function listSuppliers(): Promise<Supplier[]> {
  const sb = await getServerSupabase();
  const { data, error } = await sb
    .from('suppliers')
    .select('id,name,contact,phone,email,notes,active,categories')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Supplier[];
}

export async function upsertSupplier(s: Omit<Supplier, 'id'> & { id?: string }) {
  const sb = await getServerSupabase();
  const { error } = await sb.from('suppliers').upsert(s);
  if (error) throw new Error(error.message);
}

export async function deleteSupplier(id: string) {
  const sb = await getServerSupabase();
  const { error } = await sb.from('suppliers').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
