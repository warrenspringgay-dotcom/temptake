-- 20260205161309_remote_schema.sql
-- Fixes:
--  - Ensure pg_trgm exists in a predictable schema (extensions)
--  - Use gin_trgm_ops correctly (extensions.gin_trgm_ops, guarded)
--  - Ensure functions exist BEFORE triggers reference them
--  - Guard storage triggers so missing functions don't hard-fail migrations

-- =========================
-- Extensions
-- =========================

-- Make sure extensions schema exists
create schema if not exists extensions;

-- Install pg_trgm into extensions schema
create extension if not exists pg_trgm with schema extensions;

-- =========================
-- DDL changes
-- =========================

drop trigger if exists "trg_set_org_id_food" on "public"."food_temp_logs";

drop index if exists "public"."allergen_matrix_item_trgm";

create table if not exists "public"."location_staff" (
  "id" uuid not null default gen_random_uuid(),
  "org_id" uuid not null,
  "location_id" uuid not null,
  "staff_profile_id" uuid not null,
  "initials" text,
  "active" boolean not null default true,
  "created_at" timestamp with time zone not null default now()
);

alter table "public"."billing_subscriptions" add column if not exists "max_locations" integer;
alter table "public"."billing_subscriptions" add column if not exists "trial_ended_sent_at" timestamp with time zone;
alter table "public"."billing_subscriptions" add column if not exists "trial_final_nudge_sent_at" timestamp with time zone;
alter table "public"."billing_subscriptions" add column if not exists "trial_reminder_sent_at" timestamp with time zone;
alter table "public"."billing_subscriptions" add column if not exists "trial_reminders" jsonb default '{}'::jsonb;

alter table "public"."cleaning_task_runs" add column if not exists "location_staff_id" uuid;
alter table "public"."cleaning_task_runs" alter column "location_id" set not null;

alter table "public"."daily_signoffs" alter column "location_id" drop not null;
alter table "public"."daily_signoffs" alter column "org_id" drop not null;

alter table "public"."food_temp_logs" add column if not exists "team_member_id" uuid;
alter table "public"."food_temp_logs" alter column "location_id" set not null;

alter table "public"."incidents" add column if not exists "location_id_uuid" uuid not null;
alter table "public"."incidents" add column if not exists "org_id_uuid" uuid not null;
alter table "public"."incidents" add column if not exists "resolved_at" timestamp with time zone;
alter table "public"."incidents" add column if not exists "resolved_by" text;

alter table "public"."profiles" add column if not exists "active_location_id" uuid;

alter table "public"."trainings" add column if not exists "course_key" text;
alter table "public"."trainings" add column if not exists "provider_name" text;

-- =========================
-- Indexes
-- =========================

create index if not exists cleaning_task_runs_loc_run_on_idx
  on public.cleaning_task_runs using btree (org_id, location_id, run_on);

create index if not exists cleaning_task_runs_org_loc_staff_run_on_idx
  on public.cleaning_task_runs using btree (org_id, location_id, location_staff_id, run_on);

create index if not exists food_temp_logs_org_loc_at_not_voided_idx
  on public.food_temp_logs using btree (org_id, location_id, at desc)
  where (voided = false);

create index if not exists food_temp_logs_org_loc_member_at_idx
  on public.food_temp_logs using btree (org_id, location_id, team_member_id, at desc);

create index if not exists idx_billing_subs_trial_ended
  on public.billing_subscriptions using btree (status, trial_ends_at, trial_ended_sent_at);

create index if not exists idx_billing_subs_trial_reminder
  on public.billing_subscriptions using btree (status, trial_ends_at, trial_reminder_sent_at);

create index if not exists idx_billing_subscriptions_org_id
  on public.billing_subscriptions using btree (org_id);

create index if not exists idx_billing_subscriptions_trial_reminder_sent_at
  on public.billing_subscriptions using btree (trial_reminder_sent_at);

create index if not exists idx_billing_subscriptions_trial_reminders
  on public.billing_subscriptions using gin (trial_reminders);

create index if not exists idx_profiles_active_location_id
  on public.profiles using btree (active_location_id);

create index if not exists incidents_loc_on_idx
  on public.incidents using btree (org_id, location_id, happened_on, created_at desc);

create index if not exists incidents_open_lookup
  on public.incidents using btree (org_id_uuid, location_id_uuid, happened_on desc, created_at desc)
  where (resolved_at is null);

create index if not exists incidents_open_lookup_idx
  on public.incidents using btree (org_id_uuid, location_id_uuid, resolved_at, happened_on desc);

create index if not exists incidents_open_lookup_text_idx
  on public.incidents using btree (org_id, location_id, resolved_at, happened_on desc);

create index if not exists incidents_resolved_at_idx
  on public.incidents using btree (resolved_at);

create index if not exists incidents_resolved_lookup
  on public.incidents using btree (org_id_uuid, location_id_uuid, resolved_at desc)
  where (resolved_at is not null);

create unique index if not exists location_staff_initials_unique
  on public.location_staff using btree (org_id, location_id, lower(initials))
  where (initials is not null);

create unique index if not exists location_staff_location_id_staff_profile_id_key
  on public.location_staff using btree (location_id, staff_profile_id);

create index if not exists location_staff_lookup
  on public.location_staff using btree (org_id, location_id, active, initials);

create unique index if not exists location_staff_pkey
  on public.location_staff using btree (id);

create unique index if not exists staff_profiles_org_email_unique
  on public.staff_profiles using btree (org_id, lower(email))
  where (email is not null);

create unique index if not exists team_members_id_org_loc_unique
  on public.team_members using btree (id, org_id, location_id);

create unique index if not exists team_members_id_org_loc_uq
  on public.team_members using btree (id, org_id, location_id);

-- ✅ TRGM index (guarded, no fancy introspection)
drop index if exists public.allergen_matrix_item_trgm;

do $$
begin
  -- Try opclass in extensions schema (common when pg_trgm installed there)
  begin
    execute '
      create index if not exists allergen_matrix_item_trgm
      on public.allergen_matrix
      using gin (item extensions.gin_trgm_ops)
    ';
    return;
  exception when undefined_object then
    -- try next
    null;
  end;

  -- Try unqualified (if pg_trgm is on search_path / default)
  begin
    execute '
      create index if not exists allergen_matrix_item_trgm
      on public.allergen_matrix
      using gin (item gin_trgm_ops)
    ';
    return;
  exception when undefined_object then
    null;
  end;

  raise notice 'gin_trgm_ops not available; skipping allergen_matrix_item_trgm index';
end $$;


-- =========================
-- Constraints / FKs
-- =========================

alter table "public"."location_staff"
  add constraint if not exists "location_staff_pkey"
  primary key using index "location_staff_pkey";

alter table "public"."cleaning_task_runs"
  add constraint if not exists "cleaning_task_runs_location_staff_fk"
  foreign key (location_staff_id)
  references public.location_staff(id)
  on delete set null not valid;

alter table "public"."cleaning_task_runs"
  validate constraint "cleaning_task_runs_location_staff_fk";

alter table "public"."food_temp_logs"
  add constraint if not exists "food_temp_logs_team_member_same_loc_fk"
  foreign key (team_member_id, org_id, location_id)
  references public.team_members(id, org_id, location_id)
  on delete set null not valid;

alter table "public"."food_temp_logs"
  validate constraint "food_temp_logs_team_member_same_loc_fk";

alter table "public"."location_staff"
  add constraint if not exists "location_staff_location_id_fkey"
  foreign key (location_id)
  references public.locations(id)
  on delete cascade not valid;

alter table "public"."location_staff"
  validate constraint "location_staff_location_id_fkey";

alter table "public"."location_staff"
  add constraint if not exists "location_staff_location_id_staff_profile_id_key"
  unique using index "location_staff_location_id_staff_profile_id_key";

alter table "public"."location_staff"
  add constraint if not exists "location_staff_org_id_fkey"
  foreign key (org_id)
  references public.orgs(id)
  on delete cascade not valid;

alter table "public"."location_staff"
  validate constraint "location_staff_org_id_fkey";

alter table "public"."location_staff"
  add constraint if not exists "location_staff_staff_profile_id_fkey"
  foreign key (staff_profile_id)
  references public.staff_profiles(id)
  on delete cascade not valid;

alter table "public"."location_staff"
  validate constraint "location_staff_staff_profile_id_fkey";

alter table "public"."team_members"
  add constraint if not exists "team_members_id_org_loc_unique"
  unique using index "team_members_id_org_loc_unique";

alter table "public"."trainings"
  add constraint if not exists "trainings_provider_chk"
  check (
    (provider_name is null)
    or (provider_name = any (array['Highfield'::text, 'Other'::text]))
  ) not valid;

alter table "public"."trainings"
  validate constraint "trainings_provider_chk";

-- =========================
-- Functions (MUST come before triggers)
-- =========================

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_add_location(p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  allowed integer;
  used integer;
begin
  select coalesce(max_locations, 1)
    into allowed
  from public.billing_subscriptions
  where org_id = p_org_id
  order by created_at desc
  limit 1;

  select count(*)
    into used
  from public.locations
  where org_id = p_org_id
    and active = true;

  return used < allowed;
end;
$function$;

CREATE OR REPLACE FUNCTION public.food_temp_logs_set_context()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  if new.org_id is null then
    raise exception 'org_id is required';
  end if;

  if new.location_id is null then
    raise exception 'location_id is required';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_location_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  select p.active_location_id
  from public.profiles p
  where p.id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.get_active_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $function$
  select p.org_id
  from public.profiles p
  where p.id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.fill_cleaning_logs_calendar()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.week    := COALESCE(NEW.week,    EXTRACT(WEEK  FROM NEW.date)::int);
  NEW.year    := COALESCE(NEW.year,    EXTRACT(YEAR  FROM NEW.date)::int);
  NEW.month   := COALESCE(NEW.month,   EXTRACT(MONTH FROM NEW.date)::int);
  NEW.weekday := COALESCE(NEW.weekday, ((EXTRACT(DOW FROM NEW.date)::int + 6) % 7) + 1);
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.food_temp_logs_autofill()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if new.status is null then
    new.status := 'pass';
  end if;

  if new.meta is null then
    new.meta := '{}'::jsonb;
  end if;

  return new;
end;
$function$;

create or replace view "public"."report_events_90d" as
SELECT
  (id)::text AS id,
  'temps'::text AS section,
  taken_at AS at,
  item AS title,
  format('%.1f°C • %s • %s'::text, temp_c, COALESCE(location, 'Unknown'::text), source) AS details,
  org_id
FROM public.food_temps ft
WHERE (taken_at >= (now() - '90 days'::interval));

CREATE OR REPLACE FUNCTION public.seed_org_defaults(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_routine_id uuid;
begin
  insert into public.cleaning_tasks
    (org_id, area, name, task, category, frequency, weekday, month_day, active)
  values
    (p_org_id, 'Kitchen', 'Opening – fridges', 'Check all fridge temperatures and record any issues', 'Opening checks', 'daily', null, null, true),
    (p_org_id, 'Kitchen', 'Opening – freezers', 'Check freezer temperatures and doors are fully closed', 'Opening checks', 'daily', null, null, true),
    (p_org_id, 'Prep area', 'Mid-shift – sanitise surfaces', 'Sanitise all prep surfaces and change cloths', 'Mid shift', 'daily', null, null, true),
    (p_org_id, 'Kitchen', 'Clean-down – equipment', 'Clean and sanitise grills / fryers / ovens as per procedure', 'Cleaning down', 'daily', null, null, true),
    (p_org_id, 'Kitchen', 'Closing – bins & floors', 'Empty bins, clean floors and remove food waste', 'Closing down', 'daily', null, null, true),
    (p_org_id, 'Office', 'Weekly paperwork check', 'Check that all daily checks have been completed and filed', 'Admin', 'weekly', 1, null, true);

  insert into public.temp_routines (id, org_id, name, active)
  values (gen_random_uuid(), p_org_id, 'Cooking', true)
  returning id into v_routine_id;

  insert into public.temp_routine_items
    (routine_id, position, location, item, target_key)
  values
    (v_routine_id, 1, 'kitchen', 'nugget', 'cooked'),
    (v_routine_id, 2, 'kitchen', 'fish', 'cooked'),
    (v_routine_id, 3, 'kitchen', 'burger', 'cooked'),
    (v_routine_id, 4, 'kitchen', 'chicken', 'cooked');

  insert into public.allergen_review (org_id, last_reviewed, interval_days)
  values (p_org_id, null, 90)
  on conflict (org_id) do nothing;
end;
$function$;

-- =========================
-- Grants (as you had them)
-- =========================

grant delete on table "public"."location_staff" to "anon";
grant insert on table "public"."location_staff" to "anon";
grant references on table "public"."location_staff" to "anon";
grant select on table "public"."location_staff" to "anon";
grant trigger on table "public"."location_staff" to "anon";
grant truncate on table "public"."location_staff" to "anon";
grant update on table "public"."location_staff" to "anon";

grant delete on table "public"."location_staff" to "authenticated";
grant insert on table "public"."location_staff" to "authenticated";
grant references on table "public"."location_staff" to "authenticated";
grant select on table "public"."location_staff" to "authenticated";
grant trigger on table "public"."location_staff" to "authenticated";
grant truncate on table "public"."location_staff" to "authenticated";
grant update on table "public"."location_staff" to "authenticated";

grant delete on table "public"."location_staff" to "service_role";
grant insert on table "public"."location_staff" to "service_role";
grant references on table "public"."location_staff" to "service_role";
grant select on table "public"."location_staff" to "service_role";
grant trigger on table "public"."location_staff" to "service_role";
grant truncate on table "public"."location_staff" to "service_role";
grant update on table "public"."location_staff" to "service_role";

-- =========================
-- Policies (as you had them)
-- =========================

create policy "food_temp_logs_insert_loc"
on "public"."food_temp_logs"
as permissive
for insert
to authenticated
with check (((org_id = public.get_active_org_id()) AND (location_id = public.get_active_location_id())));

create policy "food_temp_logs_org_location_access"
on "public"."food_temp_logs"
as permissive
for all
to public
using (
  (exists (select 1 from public.profiles p where ((p.id = auth.uid()) and (p.org_id = food_temp_logs.org_id))))
  and
  (exists (select 1 from public.locations l where ((l.id = food_temp_logs.location_id) and (l.org_id = food_temp_logs.org_id) and (l.active = true))))
)
with check (
  (exists (select 1 from public.profiles p where ((p.id = auth.uid()) and (p.org_id = food_temp_logs.org_id))))
  and
  (exists (select 1 from public.locations l where ((l.id = food_temp_logs.location_id) and (l.org_id = food_temp_logs.org_id) and (l.active = true))))
);

create policy "food_temp_logs_select_loc"
on "public"."food_temp_logs"
as permissive
for select
to authenticated
using (((org_id = public.get_active_org_id()) AND (location_id = public.get_active_location_id())));

create policy "food_temp_logs_update_loc"
on "public"."food_temp_logs"
as permissive
for update
to authenticated
using (((org_id = public.get_active_org_id()) AND (location_id = public.get_active_location_id())))
with check (((org_id = public.get_active_org_id()) AND (location_id = public.get_active_location_id())));

create policy "incidents_update_authenticated"
on "public"."incidents"
as permissive
for update
to authenticated
using (true)
with check (true);

create policy "locations_insert_within_plan_limit"
on "public"."locations"
as permissive
for insert
to authenticated
with check (public.can_add_location(org_id));

-- =========================
-- Triggers (function-first ordering fixed)
-- =========================

drop trigger if exists trg_food_temp_logs_set_context on public.food_temp_logs;

CREATE TRIGGER trg_food_temp_logs_set_context
BEFORE INSERT ON public.food_temp_logs
FOR EACH ROW
EXECUTE FUNCTION public.food_temp_logs_set_context();

-- =========================
-- Storage triggers (guarded so staging/prod differences don't brick the migration)
-- =========================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'storage'
      AND p.proname = 'delete_prefix_hierarchy_trigger'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS objects_delete_delete_prefix ON storage.objects';
    EXECUTE '
      CREATE TRIGGER objects_delete_delete_prefix
      AFTER DELETE ON storage.objects
      FOR EACH ROW
      EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()
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
      WHEN ((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))
      EXECUTE FUNCTION storage.objects_update_prefix_trigger()
    ';
  END IF;
END $$;
