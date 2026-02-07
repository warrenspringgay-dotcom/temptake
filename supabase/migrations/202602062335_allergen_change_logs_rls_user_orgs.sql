alter table public.allergen_change_logs enable row level security;

drop policy if exists "acl_select_allergen_change_logs" on public.allergen_change_logs;
drop policy if exists "acl_insert_allergen_change_logs" on public.allergen_change_logs;

create policy "acl_select_allergen_change_logs"
on public.allergen_change_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.user_orgs uo
    where uo.org_id = allergen_change_logs.org_id
      and uo.user_id = auth.uid()
  )
);

create policy "acl_insert_allergen_change_logs"
on public.allergen_change_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_orgs uo
    where uo.org_id = allergen_change_logs.org_id
      and uo.user_id = auth.uid()
  )
);
