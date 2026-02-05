drop policy if exists "daily_signoffs_insert_org" on "public"."daily_signoffs";


drop policy if exists "daily_signoffs_org_read" on "public"."daily_signoffs";

drop policy if exists "daily_signoffs_org_update" on "public"."daily_signoffs";

drop policy if exists "daily_signoffs_org_write" on "public"."daily_signoffs";

drop policy if exists "daily_signoffs_select_org" on "public"."daily_signoffs";

drop policy if exists "daily_signoffs_update_org" on "public"."daily_signoffs";

drop index if exists "public"."daily_signoffs_unique";

alter table "public"."billing_customers" alter column "stripe_customer_id" drop not null;

alter table "public"."billing_subscriptions" add column if not exists "cancelled_sent_at" timestamp with time zone;

alter table "public"."billing_subscriptions" add column if not exists "last_payment_event_id" text;

alter table "public"."billing_subscriptions" add column if not exists "payment_failed_sent_at" timestamp with time zone;

-- Drop ALL existing policies on daily_signoffs (prod may have legacy policy names)
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'daily_signoffs'
  loop
    execute format('drop policy if exists %I on public.daily_signoffs;', p.policyname);
  end loop;
end $$;


alter table "public"."daily_signoffs" alter column "location_id" set data type uuid using "location_id"::uuid;

alter table "public"."daily_signoffs" alter column "org_id" set data type uuid using "org_id"::uuid;

drop extension if exists "unaccent";

CREATE UNIQUE INDEX daily_signoffs_unique ON public.daily_signoffs USING btree (org_id, location_id, signoff_on);


  create policy "daily_signoffs_delete"
  on "public"."daily_signoffs"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_orgs uo
  WHERE ((uo.org_id = daily_signoffs.org_id) AND (uo.user_id = auth.uid())))));



  create policy "daily_signoffs_insert"
  on "public"."daily_signoffs"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.user_orgs uo
  WHERE ((uo.org_id = daily_signoffs.org_id) AND (uo.user_id = auth.uid())))));



  create policy "daily_signoffs_select"
  on "public"."daily_signoffs"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_orgs uo
  WHERE ((uo.org_id = daily_signoffs.org_id) AND (uo.user_id = auth.uid())))));



  create policy "daily_signoffs_update"
  on "public"."daily_signoffs"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.user_orgs uo
  WHERE ((uo.org_id = daily_signoffs.org_id) AND (uo.user_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.user_orgs uo
  WHERE ((uo.org_id = daily_signoffs.org_id) AND (uo.user_id = auth.uid())))));


drop trigger if exists objects_delete_delete_prefix on storage.objects;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage'
      AND p.proname = 'delete_prefix_hierarchy_trigger'
  ) THEN
    -- Drop first to avoid "already exists" if rerun
    EXECUTE 'DROP TRIGGER IF EXISTS objects_delete_delete_prefix ON storage.objects';
    EXECUTE '
      CREATE TRIGGER objects_delete_delete_prefix
      AFTER DELETE ON storage.objects
      FOR EACH ROW
      EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()
    ';
  END IF;
END $$;



drop trigger if exists objects_insert_create_prefix on storage.objects;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage'
      AND p.proname = 'objects_insert_prefix_trigger'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS objects_insert_create_prefix ON storage.objects';
    EXECUTE '
      CREATE TRIGGER objects_insert_create_prefix
      BEFORE INSERT ON storage.objects
      FOR EACH ROW
      EXECUTE FUNCTION storage.objects_insert_prefix_trigger()
    ';
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage'
      AND p.proname = 'objects_update_prefix_trigger'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS objects_update_create_prefix ON storage.objects';
    EXECUTE '
      CREATE TRIGGER objects_update_create_prefix
      BEFORE UPDATE ON storage.objects
      FOR EACH ROW
      WHEN (((NEW.name <> OLD.name) OR (NEW.bucket_id <> OLD.bucket_id)))
      EXECUTE FUNCTION storage.objects_update_prefix_trigger()
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage'
      AND p.proname = 'prefixes_insert_trigger'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS prefixes_create_hierarchy ON storage.prefixes';
    EXECUTE '
      CREATE TRIGGER prefixes_create_hierarchy
      BEFORE INSERT ON storage.prefixes
      FOR EACH ROW
      WHEN ((pg_trigger_depth() < 1))
      EXECUTE FUNCTION storage.prefixes_insert_trigger()
    ';
  END IF;
END $$;


DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage'
      AND p.proname = 'delete_prefix_hierarchy_trigger'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS prefixes_delete_hierarchy ON storage.prefixes';
    EXECUTE '
      CREATE TRIGGER prefixes_delete_hierarchy
      AFTER DELETE ON storage.prefixes
      FOR EACH ROW
      EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()
    ';
  END IF;
END $$;







