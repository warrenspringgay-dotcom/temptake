-- 20260205161309_remote_schema.sql
-- Fixes:
--  - Install pg_trgm in a predictable schema (extensions)
--  - Create TRGM index using the correct schema-qualified gin_trgm_ops (auto-detected)
--  - Guard constraints properly (Postgres does NOT support ADD CONSTRAINT IF NOT EXISTS)
--  - Handle "index exists" by using USING INDEX
--  - Ensure functions exist BEFORE triggers reference them
--  - Guard storage triggers so missing functions don't hard-fail migrations

-- =========================
-- Extensions
-- =========================
create schema if not exists extensions;
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

-- These two might already exist as indexes in one env or the other.
-- We keep them as indexes, and constraints below will attach USING INDEX if needed.
create unique index if not exists location_staff_location_id_staff_profile_id_key
  on public.location_staff using btree (location_id, staff_profile_id);

create unique index if not exists location_staff_pkey
  on public.location_staff using btree (id);

create index if not exists location_staff_lookup
  on public.location_staff using btree (org_id, location_id, active, initials);

create unique index if not exists staff_profiles_org_email_unique
  on public.staff_profiles using btree (org_id, lower(email))
  where (email is not null);

create unique index if not exists team_members_id_org_loc_unique
  on public.team_members using btree (id, org_id, location_id);

create unique index if not exists team_members_id_org_loc_uq
  on public.team_members using btree (id, org_id, location_id);

-- ✅ TRGM index: detect schema for gin_trgm_ops and build safely
drop index if exists public.allergen_matrix_item_trgm;

do $$
declare
  sch text;
begin
  select n.nspname
    into sch
  from pg_opclass oc
  join pg_namespace n on n.oid = oc.opcnamespace
  join pg_am am on am.oid = oc.opcmethod
  where oc.opcname = 'gin_trgm_ops'
    and am.amname = 'gin'
  limit 1;

  if sch is not null then
    execute format(
      'create index if not exists allergen_matrix_item_trgm on public.allergen_matrix using gin (item %I.gin_trgm_ops);',
      sch
    );
  else
    raise notice 'Skipping allergen_matrix_item_trgm: gin_trgm_ops not found.';
  end if;
end $$;

-- =========================
-- Constraints / FKs (Postgres-safe guards + USING INDEX)
-- =========================

-- PK: location_staff_pkey (attach using existing index if present)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'location_staff_pkey'
      and conrelid = 'public.location_staff'::regclass
  ) then
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where c.relname = 'location_staff_pkey'
        and n.nspname = 'public'
    ) then
      alter table public.location_staff
        add constraint location_staff_pkey primary key using index location_staff_pkey;
    else
      alter table public.location_staff
        add constraint location_staff_pkey primary key (id);
    end if;
  end if;
end $$;

-- UNIQUE: location_staff_location_id_staff_profile_id_key (attach using existing index if present)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'location_staff_location_id_staff_profile_id_key'
      and conrelid = 'public.location_staff'::regclass
  ) then
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where c.relname = 'location_staff_location_id_staff_profile_id_key'
        and n.nspname = 'public'
    ) then
      alter table public.location_staff
        add constraint location_staff_location_id_staff_profile_id_key
        unique using index location_staff_location_id_staff_profile_id_key;
    else
      alter table public.location_staff
        add constraint location_staff_location_id_staff_profile_id_key
        unique (location_id, staff_profile_id);
    end if;
  end if;
end $$;

-- UNIQUE: team_members_id_org_loc_unique (attach using existing index if present)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_members_id_org_loc_unique'
      and conrelid = 'public.team_members'::regclass
  ) then
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where c.relname = 'team_members_id_org_loc_unique'
        and n.nspname = 'public'
    ) then
      alter table public.team_members
        add constraint team_members_id_org_loc_unique
        unique using index team_members_id_org_loc_unique;
    else
      alter table public.team_members
        add constraint team_members_id_org_loc_unique
        unique (id, org_id, location_id);
    end if;
  end if;
end $$;

-- CHECK: trainings_provider_chk
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trainings_provider_chk'
      and conrelid = 'public.trainings'::regclass
  ) then
    alter table public.trainings
      add constraint trainings_provider_chk
      check (
        (provider_name is null)
        or (provider_name = any (array['Highfield'::text, 'Other'::text]))
      );
  end if;
end $$;

-- FK: cleaning_task_runs_location_staff_fk
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cleaning_task_runs_location_staff_fk'
      and conrelid = 'public.cleaning_task_runs'::regclass
  ) then
    alter table public.cleaning_task_runs
      add constraint cleaning_task_runs_location_staff_fk
      foreign key (location_staff_id)
      references public.location_staff(id)
      on delete set null;
  end if;
end $$;

-- FK: food_temp_logs_team_member_same_loc_fk
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_temp_logs_team_member_same_loc_fk'
      and conrelid = 'public.food_temp_logs'::regclass
  ) then
    alter table public.food_temp_logs
      add constraint food_temp_logs_team_member_same_loc_fk
      foreign key (team_member_id, org_id, location_id)
      references public.team_members(id, org_id, location_id)
      on delete set null;
  end if;
end $$;

-- FK: location_staff_location_id_fkey
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'location_staff_location_id_fkey'
      and conrelid = 'public.location_staff'::regclass
  ) then
    alter table public.location_staff
      add constraint location_staff_location_id_fkey
      foreign key (location_id)
      references public.locations(id)
      on delete cascade;
  end if;
end $$;

-- FK: location_staff_org_id_fkey
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'location_staff_org_id_fkey'
      and conrelid = 'public.location_staff'::regclass
  ) then
    alter table public.location_staff
      add constraint location_staff_org_id_fkey
      foreign key (org_id)
      references public.orgs(id)
      on delete cascade;
  end if;
end $$;

-- FK: location_staff_staff_profile_id_fkey
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'location_staff_staff_profile_id_fkey'
      and conrelid = 'public.location_staff'::regclass
  ) then
    alter table public.location_staff
      add constraint location_staff_staff_profile_id_fkey
      foreign key (staff_profile_id)
      references public.staff_profiles(id)
      on delete cascade;
  end if;
end $$;

-- =========================
-- Functions (MUST come before triggers)
-- =========================
set check_function_bodies = off;

create or replace function public.can_add_location(p_org_id uuid)
returns boolean
language plpgsql
security definer
as $function$
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

create or replace function public.food_temp_logs_set_context()
returns trigger
language plpgsql
as $function$
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

create or replace function public.get_active_location_id()
returns uuid
language sql
stable
as $function$
  select p.active_location_id
  from public.profiles p
  where p.id = auth.uid()
$function$;

create or replace function public.get_active_org_id()
returns uuid
language sql
stable
as $function$
  select p.org_id
  from public.profiles p
  where p.id = auth.uid()
$function$;

create or replace function public.fill_cleaning_logs_calendar()
returns trigger
language plpgsql
as $function$
begin
  new.week    := coalesce(new.week,    extract(week  from new.date)::int);
  new.year    := coalesce(new.year,    extract(year  from new.date)::int);
  new.month   := coalesce(new.month,   extract(month from new.date)::int);
  new.weekday := coalesce(new.weekday, ((extract(dow from new.date)::int + 6) % 7) + 1);
  return new;
end
$function$;

create or replace function public.food_temp_logs_autofill()
returns trigger
language plpgsql
as $function$
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

create or replace view public.report_events_90d as
select
  (id)::text as id,
  'temps'::text as section,
  taken_at as at,
  item as title,
  format('%.1f°C • %s • %s'::text, temp_c, coalesce(location, 'Unknown'::text), source) as details,
  org_id
from public.food_temps ft
where (taken_at >= (now() - '90 days'::interval));

create or replace function public.seed_org_defaults(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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
-- Triggers (function-first ordering fixed)
-- =========================
drop trigger if exists trg_food_temp_logs_set_context on public.food_temp_logs;

create trigger trg_food_temp_logs_set_context
before insert on public.food_temp_logs
for each row
execute function public.food_temp_logs_set_context();

-- =========================
-- Storage triggers (guarded)
-- =========================
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'storage'
      and p.proname = 'delete_prefix_hierarchy_trigger'
  ) then
    execute 'drop trigger if exists objects_delete_delete_prefix on storage.objects';
    execute '
      create trigger objects_delete_delete_prefix
      after delete on storage.objects
      for each row
      execute function storage.delete_prefix_hierarchy_trigger()
    ';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'storage'
      and p.proname = 'objects_insert_prefix_trigger'
  ) then
    execute 'drop trigger if exists objects_insert_create_prefix on storage.objects';
    execute '
      create trigger objects_insert_create_prefix
      before insert on storage.objects
      for each row
      execute function storage.objects_insert_prefix_trigger()
    ';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'storage'
      and p.proname = 'objects_update_prefix_trigger'
  ) then
    execute 'drop trigger if exists objects_update_create_prefix on storage.objects';
    execute '
      create trigger objects_update_create_prefix
      before update on storage.objects
      for each row
      when ((new.name <> old.name) or (new.bucket_id <> old.bucket_id))
      execute function storage.objects_update_prefix_trigger()
    ';
  end if;
end $$;
