

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."array_distinct_text"("arr" "text"[]) RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select coalesce(array_agg(distinct x), '{}')
  from unnest(arr) as t(x);
$$;


ALTER FUNCTION "public"."array_distinct_text"("arr" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_current_org"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select org_id
  from public.profiles
  where id = auth.uid();
$$;


ALTER FUNCTION "public"."auth_current_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select org_id from public.profiles where id = auth.uid()
$$;


ALTER FUNCTION "public"."auth_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_routine"("_routine_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists(
    select 1
    from public.temp_routines r
    where r.id = _routine_id
      and (
        r.created_by = auth.uid()
        or (r.org_id is not null and r.org_id = public.jwt_org_id())
      )
  );
$$;


ALTER FUNCTION "public"."can_access_routine"("_routine_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_team"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.team_members tm
    where tm.org_id = p_org_id
      and lower(tm.email) = lower(auth.email())
      and lower(coalesce(tm.role, '')) in ('owner','manager','admin')
      and coalesce(tm.active, true)
  );
$$;


ALTER FUNCTION "public"."can_manage_team"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_member_role"("p_org_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (
      select lower(role)
      from team_members
      where org_id = p_org_id
        and lower(email) = current_user_email()
        and coalesce(active, true) = true
      limit 1
    ),
    'staff'
  );
$$;


ALTER FUNCTION "public"."current_member_role"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  select u.org_id
  from public.user_orgs u
  where u.user_id = auth.uid()
  limit 1
$$;


ALTER FUNCTION "public"."current_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_org_role"("target_org_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    select tm.role
    from public.team_members tm
    where tm.org_id = target_org_id
      and coalesce(tm.active, true)
      and lower(tm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    limit 1;
  $$;


ALTER FUNCTION "public"."current_org_role"("target_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;


ALTER FUNCTION "public"."current_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_org_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select org_id
  from public.team_members
  where coalesce(active, true)
    and (
      user_id = auth.uid()
      or lower(coalesce(email,'')) = lower(coalesce(auth.jwt()->>'email',''))
    );
$$;


ALTER FUNCTION "public"."current_user_org_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_org_for_user"("uid" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  existing uuid;
  new_org uuid;
begin
  select org_id into existing from public.user_orgs where user_id = uid limit 1;
  if existing is not null then
    return existing;
  end if;

  insert into public.orgs (name) values ('My Organization') returning id into new_org;
  insert into public.user_orgs (org_id, user_id, role) values (new_org, uid, 'owner');
  return new_org;
end
$$;


ALTER FUNCTION "public"."ensure_org_for_user"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fill_cleaning_logs_calendar"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- ISO week-of-year (1ÔÇô53)
  NEW.week    := COALESCE(NEW.week,    EXTRACT(WEEK  FROM NEW.date)::int);
  NEW.year    := COALESCE(NEW.year,    EXTRACT(YEAR  FROM NEW.date)::int);
  NEW.month   := COALESCE(NEW.month,   EXTRACT(MONTH FROM NEW.date)::int);
  -- Monday=1 ÔÇª Sunday=7
  NEW.weekday := COALESCE(NEW.weekday, ((EXTRACT(DOW FROM NEW.date)::int + 6) % 7) + 1);
  RETURN NEW;
END
$$;


ALTER FUNCTION "public"."fill_cleaning_logs_calendar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."food_temp_logs_autofill"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  if new.org_id is null then
    new.org_id := public.current_org_id();
  end if;

  return new;
end$$;


ALTER FUNCTION "public"."food_temp_logs_autofill"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_role"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role from public.profiles where id = auth.uid();
$$;


ALTER FUNCTION "public"."get_current_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."give_points_for_cleaning_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.points_events (org_id, user_id, source, source_id, points, occurred_at)
  values (new.org_id, new.completed_by, 'cleaning_log', new.id, 5, coalesce(new.completed_at, now()));
  return new;
end;
$$;


ALTER FUNCTION "public"."give_points_for_cleaning_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."give_points_for_temp_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.points_events (org_id, user_id, source, source_id, points, occurred_at)
  values (new.org_id, new.created_by, 'temp_log', new.id, 1, coalesce(new.created_at, now()));
  return new;
end;
$$;


ALTER FUNCTION "public"."give_points_for_temp_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_link_membership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Link any pre-existing membership rows by email to this new auth user
  update public.team_members
    set user_id = new.id
  where user_id is null
    and lower(coalesce(email, '')) = lower(coalesce(new.email, ''));

  -- (Optional) ensure a profile row exists and mirrors email/name
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do update
    set email = excluded.email
  ;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_link_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.role = any('{manager,owner}'::text[])
  from public.profiles p
  where p.id = uid
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_current_user_org_manager"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.team_members tm
    where tm.org_id = p_org
      and coalesce(tm.active, true)
      and lower(coalesce(tm.role, 'staff')) in ('owner','manager','admin')
      and lower(coalesce(tm.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;


ALTER FUNCTION "public"."is_current_user_org_manager"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_manager"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(role in ('manager','owner'), false)
  from public.profiles
  where id = auth.uid();
$$;


ALTER FUNCTION "public"."is_manager"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_manager_of"("org" "uuid", "user_email" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.team_members tm
    where tm.org_id = org
      and lower(coalesce(tm.email,'')) = lower(coalesce(user_email,''))
      and coalesce(tm.active, true)
      and lower(coalesce(tm.role,'')) in ('owner','manager','admin')
  );
$$;


ALTER FUNCTION "public"."is_manager_of"("org" "uuid", "user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member"("p_org" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.user_orgs uo
    where uo.org_id = p_org
      and uo.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_member"("p_org" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_of"("org" "uuid", "user_email" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.team_members tm
    where tm.org_id = org
      and lower(coalesce(tm.email,'')) = lower(coalesce(user_email,''))
      and coalesce(tm.active, true)
  );
$$;


ALTER FUNCTION "public"."is_member_of"("org" "uuid", "user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_manager"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select current_member_role(p_org_id) in ('owner', 'manager', 'admin');
$$;


ALTER FUNCTION "public"."is_org_manager"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.team_members tm
    where tm.org_id = p_org_id
      and lower(tm.email) = lower(auth.email())
      and coalesce(tm.active, true)
  );
$$;


ALTER FUNCTION "public"."is_org_member"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jwt_org_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select nullif(                               -- turn empty string into NULL
           (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id'),
           ''
         )::uuid
$$;


ALTER FUNCTION "public"."jwt_org_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_user_to_orgs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.user_orgs (user_id, org_id)
  select new.id, tm.org_id
  from public.team_members tm
  where tm.email is not null
    and lower(tm.email) = lower(coalesce(new.email, ''))
  on conflict (user_id, org_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."link_user_to_orgs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_org"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select uo.org_id
  from public.user_orgs uo
  where uo.user_id = auth.uid()
  order by uo.created_at asc
  limit 1;
$$;


ALTER FUNCTION "public"."my_org"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restrict_kitchen_wall_updates"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if exists (select 1 from team_members tm where tm.user_id = auth.uid() and tm.org_id = NEW.org_id and tm.role in ('owner','manager','admin')) then
    return NEW; -- managers can do anything
  end if;

  NEW.author_initials := OLD.author_initials;
  NEW.author_name     := OLD.author_name;
  NEW.message         := OLD.message;
  NEW.color           := OLD.color;
  NEW.is_pinned       := OLD.is_pinned;
  NEW.org_id          := OLD.org_id;
  NEW.location_id     := OLD.location_id;
  NEW.created_at      := OLD.created_at;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."restrict_kitchen_wall_updates"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_cleaning_tasks_for_location"("p_org" "uuid", "p_location" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.cleaning_tasks (org_id, location_id, title, category, frequency, active)
  select
    p_org,
    p_location,
    t.title,
    t.category,
    t.frequency,
    t.active
  from public.cleaning_task_templates t
  on conflict (org_id, location_id, category, title) do nothing;
end;
$$;


ALTER FUNCTION "public"."seed_cleaning_tasks_for_location"("p_org" "uuid", "p_location" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_cleaning_tasks_for_org_location"("p_org_id" "uuid", "p_location_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into public.cleaning_tasks
    (org_id, location_id, category, task, area, frequency, position, active)
  select
    p_org_id,
    p_location_id,
    t.category,
    t.title,
    t.area,
    t.frequency,
    t.sort_order,
    t.active
  from public.cleaning_task_templates t
  where t.active = true
    and not exists (
      select 1
      from public.cleaning_tasks ct
      where ct.org_id = p_org_id
        and ct.location_id is not distinct from p_location_id
        and ct.category is not distinct from t.category
        and ct.task = t.title
    );
end;
$$;


ALTER FUNCTION "public"."seed_cleaning_tasks_for_org_location"("p_org_id" "uuid", "p_location_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_org_defaults"("p_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_routine_id uuid;
begin
  ----------------------------------------------------------------
  -- Default cleaning tasks
  ----------------------------------------------------------------
  insert into public.cleaning_tasks
    (org_id, area, name, task, category, frequency, weekday, month_day, active)
  values
    -- Opening checks
    (p_org_id, 'Kitchen', 'Opening ÔÇô fridges', 'Check all fridge temperatures and record any issues', 'Opening checks', 'daily', null, null, true),
    (p_org_id, 'Kitchen', 'Opening ÔÇô freezers', 'Check freezer temperatures and doors are fully closed', 'Opening checks', 'daily', null, null, true),

    -- Mid shift
    (p_org_id, 'Prep area', 'Mid-shift ÔÇô sanitise surfaces', 'Sanitise all prep surfaces and change cloths', 'Mid shift', 'daily', null, null, true),

    -- Cleaning down
    (p_org_id, 'Kitchen', 'Clean-down ÔÇô equipment', 'Clean and sanitise grills / fryers / ovens as per procedure', 'Cleaning down', 'daily', null, null, true),

    -- Closing down
    (p_org_id, 'Kitchen', 'Closing ÔÇô bins & floors', 'Empty bins, clean floors and remove food waste', 'Closing down', 'daily', null, null, true),

    -- Admin (weekly example)
    (p_org_id, 'Office', 'Weekly paperwork check', 'Check that all daily checks have been completed and filed', 'Admin', 'weekly', 1, null, true); -- 1 = Monday

  ----------------------------------------------------------------
  -- Default food temperature routine: "Cooking"
  ----------------------------------------------------------------
  insert into public.temp_routines (id, org_id, name, active)
  values (gen_random_uuid(), p_org_id, 'Cooking', true)
  returning id into v_routine_id;

  -- Note: target_key values are generic. If they donÔÇÖt match an existing preset
  -- theyÔÇÖll still work, they just wonÔÇÖt show a fancy label until you edit them.
  insert into public.temp_routine_items
    (routine_id, position, location, item, target_key)
  values
    (v_routine_id, 1, 'kitchen', 'nugget', 'cooked'),
    (v_routine_id, 2, 'kitchen', 'fish', 'cooked'),
    (v_routine_id, 3, 'kitchen', 'burger', 'cooked'),
    (v_routine_id, 4, 'kitchen', 'chicken', 'cooked');

  ----------------------------------------------------------------
  -- Default allergen review config (90-day review cycle)
  ----------------------------------------------------------------
  insert into public.allergen_review (org_id, last_reviewed, interval_days)
  values (p_org_id, null, 90)
  on conflict (org_id) do nothing;

end;
$$;


ALTER FUNCTION "public"."seed_org_defaults"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_current_timestamp_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_org_id_from_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare v_org uuid;
begin
  select org_id into v_org from public.profiles where id = auth.uid();
  if v_org is null then
    raise exception 'No org_id for current user';
  end if;
  new.org_id := coalesce(new.org_id, v_org);
  return new;
end $$;


ALTER FUNCTION "public"."set_org_id_from_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."settings_set_singleton"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.id := 1;
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION "public"."settings_set_singleton"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_members_autofill"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- fill created_by if you have this column
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='team_members' and column_name='created_by'
  ) then
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;
  end if;

  -- always set org_id if missing
  if new.org_id is null then
    new.org_id := public.current_org_id();
  end if;

  -- optional: derive initials if your table has it and it's blank
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='team_members' and column_name='initials'
  ) and (new.initials is null or length(trim(new.initials))=0) and new.name is not null then
    new.initials := upper(substr(new.name,1,1) ||
                          coalesce(nullif(split_part(new.name,' ',2),''),''));
  end if;

  return new;
end
$$;


ALTER FUNCTION "public"."team_members_autofill"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."team_members_training_areas_normalize"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.training_areas := public.array_distinct_text(coalesce(new.training_areas, '{}'));
  return new;
end;
$$;


ALTER FUNCTION "public"."team_members_training_areas_normalize"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."temp_logs_set_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- cast created_at (timestamptz) to date; always immutable
  new."date" := (new.created_at at time zone 'utc')::date;
  return new;
end
$$;


ALTER FUNCTION "public"."temp_logs_set_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_fill_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end
$$;


ALTER FUNCTION "public"."tr_fill_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_seed_cleaning_tasks_on_location_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.seed_cleaning_tasks_for_org_location(new.org_id, new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_seed_cleaning_tasks_on_location_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_set_temp_log_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- derive date from created_at in UTC (change to your desired zone if needed)
  new."date" := (timezone('UTC', new.created_at))::date;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_set_temp_log_date"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."allergen_change_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "action" "text" NOT NULL,
    "item_id" "uuid",
    "item_name" "text",
    "category_before" "text",
    "category_after" "text",
    "flags_before" "jsonb",
    "flags_after" "jsonb",
    "notes_before" "text",
    "notes_after" "text",
    "staff_initials" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."allergen_change_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allergen_flags" (
    "item_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" boolean NOT NULL,
    "org_id" "uuid" NOT NULL
);


ALTER TABLE "public"."allergen_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allergen_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid",
    "item" "text" NOT NULL,
    "category" "text",
    "notes" "text",
    "locked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL
);


ALTER TABLE "public"."allergen_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allergen_matrix" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "item" "text" NOT NULL,
    "flags" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "updated_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."allergen_matrix" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allergen_review" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "last_reviewed" "date",
    "interval_days" integer DEFAULT 180 NOT NULL,
    "reviewer" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."allergen_review" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allergen_review_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "reviewed_on" "date" NOT NULL,
    "interval_days" integer DEFAULT 30 NOT NULL,
    "reviewer_name" "text",
    "reviewer_initials" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "reviewer" "text"
);


ALTER TABLE "public"."allergen_review_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."allergen_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "last_reviewed_on" "date",
    "last_reviewed_by" "text",
    "interval_days" integer DEFAULT 30 NOT NULL,
    "next_due" "date",
    "org_id" "uuid"
);


ALTER TABLE "public"."allergen_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL
);


ALTER TABLE "public"."billing_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "stripe_subscription_id" "text",
    "status" "text" NOT NULL,
    "price_id" "text",
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "trial_ends_at" timestamp with time zone
);


ALTER TABLE "public"."billing_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_categories" (
    "id" bigint NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "position" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cleaning_categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."cleaning_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cleaning_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cleaning_categories_id_seq" OWNED BY "public"."cleaning_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."cleaning_incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "text" NOT NULL,
    "location_id" "text" NOT NULL,
    "happened_on" "date" NOT NULL,
    "type" "text",
    "details" "text",
    "corrective_action" "text",
    "preventive_action" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cleaning_incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "week" integer NOT NULL,
    "weekday" integer NOT NULL,
    "done" boolean DEFAULT true NOT NULL,
    "done_by" "text",
    "note" "text",
    "done_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE,
    "month" integer NOT NULL,
    CONSTRAINT "cleaning_logs_weekday_check" CHECK ((("weekday" >= 1) AND ("weekday" <= 7)))
);


ALTER TABLE "public"."cleaning_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_task_categories" (
    "id" bigint NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cleaning_task_categories" OWNER TO "postgres";


ALTER TABLE "public"."cleaning_task_categories" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."cleaning_task_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cleaning_task_deferrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "from_on" "date" NOT NULL,
    "to_on" "date" NOT NULL,
    "deferred_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text"
);


ALTER TABLE "public"."cleaning_task_deferrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_task_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "run_on" "date" NOT NULL,
    "done_by" "text",
    "done_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location_id" "uuid",
    "done_by_team_member_id" "uuid"
);


ALTER TABLE "public"."cleaning_task_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "area" "text",
    "frequency" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "category" "text"
);


ALTER TABLE "public"."cleaning_task_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaning_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text",
    "area" "text",
    "freq" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "task" "text",
    "frequency" "text",
    "weekday" smallint,
    "notes" "text",
    "month_day" smallint,
    "category" "text",
    "category_id" bigint,
    "location_id" "uuid",
    CONSTRAINT "cleaning_tasks_freq_check" CHECK (("freq" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "cleaning_tasks_frequency_check" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "cleaning_tasks_frequency_chk" CHECK (("frequency" = ANY (ARRAY['daily'::"text", 'weekly'::"text", 'monthly'::"text"]))),
    CONSTRAINT "cleaning_tasks_month_day_check" CHECK ((("month_day" >= 1) AND ("month_day" <= 31))),
    CONSTRAINT "cleaning_tasks_monthday_chk" CHECK ((("month_day" >= 1) AND ("month_day" <= 31))),
    CONSTRAINT "cleaning_tasks_weekday_check" CHECK ((("weekday" >= 0) AND ("weekday" <= 6))),
    CONSTRAINT "cleaning_tasks_weekday_chk" CHECK ((("weekday" >= 1) AND ("weekday" <= 7)))
);


ALTER TABLE "public"."cleaning_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_checks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "text" NOT NULL,
    "location_id" "text" NOT NULL,
    "run_on" "date" NOT NULL,
    "kind" "text" NOT NULL,
    "label" "text" NOT NULL,
    "done_by" "text",
    "done_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "compliance_checks_kind_check" CHECK (("kind" = ANY (ARRAY['opening'::"text", 'closing'::"text"])))
);


ALTER TABLE "public"."compliance_checks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "role" "text",
    "phone" "text",
    "email" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "initials" "text" NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "location_id" "uuid",
    "streak_days" integer DEFAULT 0,
    "last_activity_on" "date",
    "training_areas" "text"[] DEFAULT '{}'::"text"[] NOT NULL
);

ALTER TABLE ONLY "public"."team_members" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."current_member" AS
 SELECT "id",
    "org_id",
    "created_at",
    "name",
    "role",
    "phone",
    "email",
    "notes",
    "active",
    "initials",
    "created_by",
    "updated_at"
   FROM "public"."team_members" "tm"
  WHERE ("lower"("email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))
 LIMIT 1;


ALTER VIEW "public"."current_member" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_signoffs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "text" NOT NULL,
    "location_id" "text" NOT NULL,
    "signoff_on" "date" NOT NULL,
    "signed_by" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."daily_signoffs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "area" "text",
    "kind" "text" DEFAULT 'other'::"text" NOT NULL,
    "message" "text" NOT NULL,
    "page_path" "text",
    "meta" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feedback_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_hygiene_ratings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "rating" integer NOT NULL,
    "visit_date" "date" NOT NULL,
    "certificate_expires_at" "date",
    "issuing_authority" "text",
    "reference" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "food_hygiene_ratings_rating_check" CHECK ((("rating" >= 0) AND ("rating" <= 5)))
);


ALTER TABLE "public"."food_hygiene_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_temp_corrective_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "temp_log_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "recheck_temp_c" numeric,
    "recheck_at" timestamp with time zone,
    "recheck_status" "text",
    "recorded_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."food_temp_corrective_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_temp_log_amendments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "log_id" "uuid" NOT NULL,
    "org_id" "uuid",
    "location_id" "uuid",
    "changed_by" "text",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "old_area" "text",
    "new_area" "text",
    "old_note" "text",
    "new_note" "text",
    "old_target_key" "text",
    "new_target_key" "text",
    "old_temp_c" numeric,
    "new_temp_c" numeric,
    "reason" "text"
);


ALTER TABLE "public"."food_temp_log_amendments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_temp_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "area" "text" NOT NULL,
    "target_key" "text" NOT NULL,
    "temp_c" numeric NOT NULL,
    "status" "text" DEFAULT 'pass'::"text" NOT NULL,
    "note" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "staff_initials" "text",
    "location_id" "uuid",
    "voided" boolean DEFAULT false NOT NULL,
    "void_reason" "text",
    "voided_by" "text",
    "voided_at" timestamp with time zone
);


ALTER TABLE "public"."food_temp_logs" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."food_temp_logs_90d" AS
 SELECT "id",
    "org_id",
    "created_by",
    "at",
    "area",
    "target_key",
    "temp_c",
    "status",
    "note",
    "meta"
   FROM "public"."food_temp_logs"
  WHERE ("at" >= ("now"() - '90 days'::interval));


ALTER VIEW "public"."food_temp_logs_90d" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_temps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "taken_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location" "text" NOT NULL,
    "item" "text" NOT NULL,
    "temp_c" numeric NOT NULL,
    "source" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "food_temps_source_check" CHECK (("source" = ANY (ARRAY['probe'::"text", 'fridge'::"text", 'freezer'::"text", 'delivery'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."food_temps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."incidents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "text" NOT NULL,
    "location_id" "text" NOT NULL,
    "happened_on" "date" NOT NULL,
    "type" "text",
    "details" "text",
    "immediate_action" "text",
    "preventive_action" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kitchen_wall" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "author_initials" "text" NOT NULL,
    "author_name" "text",
    "message" "text" NOT NULL,
    "color" "text" DEFAULT 'bg-yellow-200'::"text",
    "is_pinned" boolean DEFAULT false,
    "reactions" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."kitchen_wall" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."launch_wall" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message" "text" NOT NULL,
    "initials" "text" NOT NULL,
    "color" "text" DEFAULT 'bg-orange-200'::"text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."launch_wall" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leaderboard" AS
 SELECT "tm"."org_id",
    "tm"."user_id",
    COALESCE("tm"."name", "tm"."email", 'User'::"text") AS "display_name",
    (COALESCE("tf"."temp_logs_count", (0)::bigint) + COALESCE("cf"."cleaning_count", (0)::bigint)) AS "points",
    COALESCE("tf"."temp_logs_count", (0)::bigint) AS "temp_logs_count",
    COALESCE("cf"."cleaning_count", (0)::bigint) AS "cleaning_count"
   FROM (("public"."team_members" "tm"
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "temp_logs_count"
           FROM "public"."food_temp_logs" "f"
          WHERE (("f"."org_id" = "tm"."org_id") AND ("upper"(COALESCE("f"."staff_initials", ''::"text")) = "upper"(COALESCE("tm"."initials", ''::"text"))))) "tf" ON (true))
     LEFT JOIN LATERAL ( SELECT "count"(*) AS "cleaning_count"
           FROM "public"."cleaning_task_runs" "c"
          WHERE (("c"."org_id" = "tm"."org_id") AND ("upper"(COALESCE("c"."done_by", ''::"text")) = "upper"(COALESCE("tm"."initials", ''::"text"))))) "cf" ON (true))
  WHERE (COALESCE("tm"."active", true) = true);


ALTER VIEW "public"."leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manager_signoffs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "signed_date" "date" NOT NULL,
    "manager_id" "uuid",
    "manager_email" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "signed_on" "date" NOT NULL,
    "signed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "manager_initials" "text",
    "temp_logs_today" integer DEFAULT 0 NOT NULL,
    "temp_fails_7d" integer DEFAULT 0 NOT NULL,
    "cleaning_logged_today" integer DEFAULT 0 NOT NULL,
    "training_overdue" integer DEFAULT 0 NOT NULL,
    "qc_reviews_7d" integer DEFAULT 0 NOT NULL,
    "qc_reviews_30d" integer DEFAULT 0 NOT NULL,
    "staff_reviewed_30d" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."manager_signoffs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_onboarding" (
    "org_id" "uuid" NOT NULL,
    "completed_steps" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "dismissed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."org_onboarding" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organisations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organisations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orgs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."orgs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."points_events" (
    "id" bigint NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "source_id" "uuid",
    "points" integer NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."points_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."points_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."points_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."points_events_id_seq" OWNED BY "public"."points_events"."id";



CREATE TABLE IF NOT EXISTS "public"."presets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "kind" "text" NOT NULL,
    "value" "text" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    CONSTRAINT "presets_kind_check" CHECK (("kind" = ANY (ARRAY['temperature_target'::"text", 'staff_role'::"text", 'location'::"text", 'item'::"text"])))
);


ALTER TABLE "public"."presets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid",
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "email" "text",
    CONSTRAINT "profiles_role_chk" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."report_events_90d" AS
 SELECT ("id")::"text" AS "id",
    'temps'::"text" AS "section",
    "taken_at" AS "at",
    "item" AS "title",
    "format"('%.1f┬░C ÔÇó %s ÔÇó %s'::"text", "temp_c", COALESCE("location", 'Unknown'::"text"), "source") AS "details",
    "org_id"
   FROM "public"."food_temps" "ft"
  WHERE ("taken_at" >= ("now"() - '90 days'::interval));


ALTER VIEW "public"."report_events_90d" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_dismissals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "review_key" "text" NOT NULL,
    "dismissed_until" timestamp with time zone NOT NULL,
    "dismiss_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."review_dismissals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" integer NOT NULL,
    "org_name" "text",
    "locale" "text" DEFAULT 'en-GB'::"text",
    "date_format" "text" DEFAULT 'dd/MM/yyyy'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "org_id" "uuid" NOT NULL,
    "preferred_location" "text"
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


ALTER TABLE "public"."settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "initials" "text" NOT NULL,
    "name" "text" NOT NULL,
    "jobtitle" "text",
    "phone" "text",
    "email" "text",
    "notes" "text",
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "job_title" "text",
    "phone" "text",
    "email" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "initials" "text"
);


ALTER TABLE "public"."staff_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_qc_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "manager_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "reviewed_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "rating" integer NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_qc_reviews_score_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."staff_qc_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "reviewer_email" "text" NOT NULL,
    "reviewer_name" "text",
    "review_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "category" "text" NOT NULL,
    "rating" integer NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."staff_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_training" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "training_type_id" "uuid" NOT NULL,
    "awarded_on" "date" NOT NULL,
    "expires_on" "date" NOT NULL,
    "certificate_url" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_training" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_training_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_initials" "text" NOT NULL,
    "area" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_training_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid",
    "name" "text" NOT NULL,
    "categories" "text" DEFAULT '{}'::"text"[] NOT NULL,
    "contact" "text",
    "phone" "text",
    "email" "text",
    "doc_allergen" "date",
    "doc_haccp" "date",
    "doc_insurance" "date",
    "review_every_days" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" DEFAULT "public"."current_org_id"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "frozen" boolean DEFAULT false,
    "packaging" boolean DEFAULT false,
    "produce" boolean DEFAULT false,
    "dairy" boolean DEFAULT false,
    "dry" boolean DEFAULT false,
    "other" boolean DEFAULT false,
    "types" "jsonb",
    "types_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "food_hygiene_level" "text",
    "food_hygiene_expires_on" "date"
);


ALTER TABLE "public"."team" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_member_training_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_member_id" "uuid" NOT NULL,
    "area" "text" NOT NULL,
    "completed_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expires_on" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."team_member_training_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_training_area_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "team_member_id" "uuid" NOT NULL,
    "area" "text" NOT NULL,
    "trained_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_on" "date" NOT NULL,
    "interval_days" integer DEFAULT 90 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_training_area_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."temp_corrective_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "temp_log_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "recheck_temp" numeric,
    "recheck_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "text",
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL
);


ALTER TABLE "public"."temp_corrective_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."temp_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid",
    "time_iso" timestamp with time zone DEFAULT "now"() NOT NULL,
    "item" "text" NOT NULL,
    "temp_c" numeric NOT NULL,
    "device" "text",
    "notes" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "recorded_at" "date" DEFAULT CURRENT_DATE,
    "unit" "text",
    "pass" boolean,
    "staff_initials" "text",
    "location" "text",
    "target" "text",
    "temperature" double precision,
    "date" "date",
    "staff_name" "text",
    "target_c" numeric,
    "target_key" "text",
    CONSTRAINT "temp_logs_unit_check" CHECK (("unit" = ANY (ARRAY['C'::"text", 'F'::"text"])))
);


ALTER TABLE "public"."temp_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."temp_logs"."target_key" IS 'Preset key like ambient/chilled/hot-hold etc';



CREATE TABLE IF NOT EXISTS "public"."temp_routine_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "location" "text",
    "item" "text",
    "target_key" "text" NOT NULL
);


ALTER TABLE "public"."temp_routine_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."temp_routines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" "text",
    "location" "text",
    "item" "text",
    "target_key" "text",
    "last_used_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "org_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."temp_routines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "validity_days" integer NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "training_types_validity_days_check" CHECK ((("validity_days" >= 1) AND ("validity_days" <= 3650)))
);


ALTER TABLE "public"."training_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_id" "uuid",
    "type" "text",
    "awarded_on" "date",
    "expires_on" "date",
    "certificate_url" "text",
    "notes" "text",
    "created_by" "uuid",
    "org_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_member_id" "uuid"
);


ALTER TABLE "public"."trainings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_orgs" (
    "user_id" "uuid" NOT NULL,
    "org_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "user_orgs_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."user_orgs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    CONSTRAINT "user_roles_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cleaning_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cleaning_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."points_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."points_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."allergen_change_logs"
    ADD CONSTRAINT "allergen_change_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allergen_flags"
    ADD CONSTRAINT "allergen_flags_pkey" PRIMARY KEY ("item_id", "key");



ALTER TABLE ONLY "public"."allergen_items"
    ADD CONSTRAINT "allergen_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allergen_matrix"
    ADD CONSTRAINT "allergen_matrix_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allergen_review_log"
    ADD CONSTRAINT "allergen_review_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allergen_review"
    ADD CONSTRAINT "allergen_review_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."allergen_reviews"
    ADD CONSTRAINT "allergen_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_org_unique" UNIQUE ("org_id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_org_unique" UNIQUE ("org_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."cleaning_categories"
    ADD CONSTRAINT "cleaning_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_incidents"
    ADD CONSTRAINT "cleaning_incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_logs"
    ADD CONSTRAINT "cleaning_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_logs"
    ADD CONSTRAINT "cleaning_logs_task_id_year_week_weekday_key" UNIQUE ("task_id", "year", "week", "weekday");



ALTER TABLE ONLY "public"."cleaning_task_categories"
    ADD CONSTRAINT "cleaning_task_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_task_deferrals"
    ADD CONSTRAINT "cleaning_task_deferrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_task_deferrals"
    ADD CONSTRAINT "cleaning_task_deferrals_unique" UNIQUE ("org_id", "location_id", "task_id", "from_on");



ALTER TABLE ONLY "public"."cleaning_task_runs"
    ADD CONSTRAINT "cleaning_task_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_task_runs"
    ADD CONSTRAINT "cleaning_task_runs_task_id_run_on_key" UNIQUE ("task_id", "run_on");



ALTER TABLE ONLY "public"."cleaning_task_templates"
    ADD CONSTRAINT "cleaning_task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaning_tasks"
    ADD CONSTRAINT "cleaning_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_checks"
    ADD CONSTRAINT "compliance_checks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_signoffs"
    ADD CONSTRAINT "daily_signoffs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_hygiene_ratings"
    ADD CONSTRAINT "food_hygiene_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_temp_corrective_actions"
    ADD CONSTRAINT "food_temp_corrective_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_temp_log_amendments"
    ADD CONSTRAINT "food_temp_log_amendments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_temp_logs"
    ADD CONSTRAINT "food_temp_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_temps"
    ADD CONSTRAINT "food_temps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incidents"
    ADD CONSTRAINT "incidents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kitchen_wall"
    ADD CONSTRAINT "kitchen_wall_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."launch_wall"
    ADD CONSTRAINT "launch_wall_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manager_signoffs"
    ADD CONSTRAINT "manager_signoffs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_onboarding"
    ADD CONSTRAINT "org_onboarding_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."points_events"
    ADD CONSTRAINT "points_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."presets"
    ADD CONSTRAINT "presets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_dismissals"
    ADD CONSTRAINT "review_dismissals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_dismissals"
    ADD CONSTRAINT "review_dismissals_unique" UNIQUE ("org_id", "location_id", "review_key");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("org_id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_qc_reviews"
    ADD CONSTRAINT "staff_qc_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_reviews"
    ADD CONSTRAINT "staff_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_training_areas"
    ADD CONSTRAINT "staff_training_areas_org_id_staff_initials_area_key" UNIQUE ("org_id", "staff_initials", "area");



ALTER TABLE ONLY "public"."staff_training_areas"
    ADD CONSTRAINT "staff_training_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_training"
    ADD CONSTRAINT "staff_training_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_member_training_areas"
    ADD CONSTRAINT "team_member_training_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_member_training_areas"
    ADD CONSTRAINT "team_member_training_areas_unique" UNIQUE ("team_member_id", "area");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_org_email_key" UNIQUE ("org_id", "email");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team"
    ADD CONSTRAINT "team_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_training_area_status"
    ADD CONSTRAINT "team_training_area_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_training_area_status"
    ADD CONSTRAINT "team_training_area_status_team_member_id_area_key" UNIQUE ("team_member_id", "area");



ALTER TABLE ONLY "public"."temp_corrective_actions"
    ADD CONSTRAINT "temp_corrective_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temp_logs"
    ADD CONSTRAINT "temp_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temp_routine_items"
    ADD CONSTRAINT "temp_routine_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."temp_routines"
    ADD CONSTRAINT "temp_routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_types"
    ADD CONSTRAINT "training_types_org_id_name_key" UNIQUE ("org_id", "name");



ALTER TABLE ONLY "public"."training_types"
    ADD CONSTRAINT "training_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_orgs"
    ADD CONSTRAINT "user_orgs_one_org_per_user" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_orgs"
    ADD CONSTRAINT "user_orgs_pkey" PRIMARY KEY ("user_id", "org_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "allergen_change_logs_org_created_idx" ON "public"."allergen_change_logs" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "allergen_change_logs_org_idx" ON "public"."allergen_change_logs" USING "btree" ("org_id");



CREATE INDEX "allergen_change_logs_org_loc_idx" ON "public"."allergen_change_logs" USING "btree" ("org_id", "location_id");



CREATE INDEX "allergen_items_org_idx" ON "public"."allergen_items" USING "btree" ("org_id");



CREATE INDEX "allergen_matrix_item_trgm" ON "public"."allergen_matrix" USING "gin" ("item" "extensions"."gin_trgm_ops");



CREATE INDEX "allergen_matrix_org_idx" ON "public"."allergen_matrix" USING "btree" ("org_id");



CREATE INDEX "cleaning_categories_org_id_idx" ON "public"."cleaning_categories" USING "btree" ("org_id");



CREATE INDEX "cleaning_incidents_org_loc_day" ON "public"."cleaning_incidents" USING "btree" ("org_id", "location_id", "happened_on");



CREATE INDEX "cleaning_logs_org_week_idx" ON "public"."cleaning_logs" USING "btree" ("org_id", "year", "week", "weekday");



CREATE INDEX "cleaning_logs_task_idx" ON "public"."cleaning_logs" USING "btree" ("task_id", "year", "week", "weekday");



CREATE INDEX "cleaning_task_deferrals_lookup_idx" ON "public"."cleaning_task_deferrals" USING "btree" ("org_id", "location_id", "from_on", "to_on");



CREATE INDEX "cleaning_task_deferrals_task_idx" ON "public"."cleaning_task_deferrals" USING "btree" ("task_id");



CREATE INDEX "cleaning_task_runs_done_by_tm_idx" ON "public"."cleaning_task_runs" USING "btree" ("org_id", "location_id", "run_on", "done_by_team_member_id");



CREATE INDEX "cleaning_task_runs_org_id_idx" ON "public"."cleaning_task_runs" USING "btree" ("org_id");



CREATE INDEX "cleaning_task_runs_org_loc_idx" ON "public"."cleaning_task_runs" USING "btree" ("org_id", "location_id", "run_on");



CREATE INDEX "cleaning_task_runs_task_id_idx" ON "public"."cleaning_task_runs" USING "btree" ("task_id");



CREATE UNIQUE INDEX "cleaning_task_templates_unique" ON "public"."cleaning_task_templates" USING "btree" ("category", "title");



CREATE INDEX "cleaning_tasks_category_id_idx" ON "public"."cleaning_tasks" USING "btree" ("category_id");



CREATE INDEX "cleaning_tasks_org_id_idx" ON "public"."cleaning_tasks" USING "btree" ("org_id");



CREATE INDEX "cleaning_tasks_org_idx" ON "public"."cleaning_tasks" USING "btree" ("org_id", "active", "position");



CREATE INDEX "cleaning_tasks_org_loc_idx" ON "public"."cleaning_tasks" USING "btree" ("org_id", "location_id");



CREATE UNIQUE INDEX "cleaning_tasks_unique_seed" ON "public"."cleaning_tasks" USING "btree" ("org_id", "location_id", "category", "task");



CREATE UNIQUE INDEX "compliance_checks_unique" ON "public"."compliance_checks" USING "btree" ("org_id", "location_id", "run_on", "kind", "label");



CREATE UNIQUE INDEX "daily_signoffs_unique" ON "public"."daily_signoffs" USING "btree" ("org_id", "location_id", "signoff_on");



CREATE INDEX "food_hygiene_ratings_org_loc_date_idx" ON "public"."food_hygiene_ratings" USING "btree" ("org_id", "location_id", "visit_date" DESC);



CREATE INDEX "food_temp_corrective_actions_org_loc_idx" ON "public"."food_temp_corrective_actions" USING "btree" ("org_id", "location_id", "created_at" DESC);



CREATE INDEX "food_temp_corrective_actions_temp_log_idx" ON "public"."food_temp_corrective_actions" USING "btree" ("temp_log_id");



CREATE INDEX "food_temp_logs_created_by_at_idx" ON "public"."food_temp_logs" USING "btree" ("created_by", "at");



CREATE INDEX "food_temp_logs_org_loc_at_idx" ON "public"."food_temp_logs" USING "btree" ("org_id", "location_id", "at" DESC);



CREATE INDEX "food_temp_logs_staff_idx" ON "public"."food_temp_logs" USING "btree" ("staff_initials");



CREATE INDEX "food_temps_org_time_idx" ON "public"."food_temps" USING "btree" ("org_id", "taken_at" DESC);



CREATE INDEX "food_temps_user_idx" ON "public"."food_temps" USING "btree" ("user_id");



CREATE INDEX "idx_allergen_review_log_org_loc_date" ON "public"."allergen_review_log" USING "btree" ("org_id", "location_id", "reviewed_on" DESC);



CREATE INDEX "idx_allergen_reviews_org" ON "public"."allergen_reviews" USING "btree" ("organisation_id");



CREATE INDEX "idx_cleaning_logs_org_date" ON "public"."cleaning_logs" USING "btree" ("org_id", "date");



CREATE INDEX "idx_cleaning_logs_task_date" ON "public"."cleaning_logs" USING "btree" ("task_id", "date");



CREATE INDEX "idx_cleaning_task_deferrals_lookup" ON "public"."cleaning_task_deferrals" USING "btree" ("org_id", "location_id", "from_on", "to_on");



CREATE INDEX "idx_cleaning_task_runs_org_id" ON "public"."cleaning_task_runs" USING "btree" ("org_id");



CREATE INDEX "idx_cleaning_task_runs_run_on" ON "public"."cleaning_task_runs" USING "btree" ("run_on");



CREATE INDEX "idx_cleaning_task_runs_task_id" ON "public"."cleaning_task_runs" USING "btree" ("task_id");



CREATE INDEX "idx_cleaning_task_templates_active" ON "public"."cleaning_task_templates" USING "btree" ("active", "frequency", "sort_order");



CREATE INDEX "idx_feedback_items_kind" ON "public"."feedback_items" USING "btree" ("kind");



CREATE INDEX "idx_feedback_items_org_created" ON "public"."feedback_items" USING "btree" ("org_id", "created_at" DESC);



CREATE INDEX "idx_food_temp_log_amendments_log" ON "public"."food_temp_log_amendments" USING "btree" ("log_id");



CREATE INDEX "idx_kitchen_wall_location" ON "public"."kitchen_wall" USING "btree" ("location_id");



CREATE INDEX "idx_kitchen_wall_org" ON "public"."kitchen_wall" USING "btree" ("org_id");



CREATE INDEX "idx_kitchen_wall_pinned" ON "public"."kitchen_wall" USING "btree" ("is_pinned") WHERE ("is_pinned" = true);



CREATE INDEX "idx_kitchen_wall_reactions" ON "public"."kitchen_wall" USING "gin" ("reactions");



CREATE INDEX "idx_manager_signoffs_org_loc_date" ON "public"."manager_signoffs" USING "btree" ("org_id", "location_id", "signed_date");



CREATE INDEX "idx_review_dismissals_lookup" ON "public"."review_dismissals" USING "btree" ("org_id", "location_id", "review_key");



CREATE INDEX "idx_staff_qc_reviews_location" ON "public"."staff_qc_reviews" USING "btree" ("org_id", "location_id", "reviewed_on");



CREATE INDEX "idx_staff_qc_reviews_org" ON "public"."staff_qc_reviews" USING "btree" ("org_id");



CREATE INDEX "idx_staff_qc_reviews_org_loc_date" ON "public"."staff_qc_reviews" USING "btree" ("org_id", "location_id", "reviewed_on");



CREATE INDEX "idx_staff_qc_reviews_staff" ON "public"."staff_qc_reviews" USING "btree" ("staff_id");



CREATE INDEX "idx_staff_reviews_org_date" ON "public"."staff_reviews" USING "btree" ("org_id", "review_date");



CREATE INDEX "idx_staff_reviews_org_loc_date" ON "public"."staff_reviews" USING "btree" ("org_id", "location_id", "review_date");



CREATE INDEX "idx_staff_reviews_org_staff" ON "public"."staff_reviews" USING "btree" ("org_id", "staff_id");



CREATE INDEX "idx_team_member_training_member" ON "public"."team_member_training_areas" USING "btree" ("team_member_id");



CREATE INDEX "idx_team_member_training_org" ON "public"."team_member_training_areas" USING "btree" ("org_id");



CREATE INDEX "idx_team_members_org" ON "public"."team_members" USING "btree" ("org_id");



CREATE INDEX "idx_team_training_area_status_member" ON "public"."team_training_area_status" USING "btree" ("team_member_id");



CREATE INDEX "idx_team_training_area_status_org" ON "public"."team_training_area_status" USING "btree" ("org_id");



CREATE INDEX "idx_temp_logs_date" ON "public"."temp_logs" USING "btree" ("date");



CREATE INDEX "idx_temp_logs_org_recorded_at" ON "public"."temp_logs" USING "btree" ("org_id", "recorded_at" DESC);



CREATE INDEX "idx_temp_routines_active" ON "public"."temp_routines" USING "btree" ("active");



CREATE INDEX "idx_temp_routines_org" ON "public"."temp_routines" USING "btree" ("org_id");



CREATE INDEX "idx_tr_created_by" ON "public"."temp_routines" USING "btree" ("created_by");



CREATE INDEX "idx_tr_org" ON "public"."temp_routines" USING "btree" ("org_id");



CREATE INDEX "idx_trainings_team_member_id" ON "public"."trainings" USING "btree" ("team_member_id");



CREATE INDEX "idx_tri_routine_pos" ON "public"."temp_routine_items" USING "btree" ("routine_id", "position");



CREATE INDEX "incidents_lookup" ON "public"."incidents" USING "btree" ("org_id", "location_id", "happened_on", "created_at" DESC);



CREATE INDEX "manager_signoffs_org_loc_day_idx" ON "public"."manager_signoffs" USING "btree" ("org_id", "location_id", "signed_on");



CREATE INDEX "manager_signoffs_org_loc_signedat_idx" ON "public"."manager_signoffs" USING "btree" ("org_id", "location_id", "signed_at" DESC);



CREATE INDEX "org_onboarding_org_id_idx" ON "public"."org_onboarding" USING "btree" ("org_id");



CREATE UNIQUE INDEX "presets_org_kind_value_uidx" ON "public"."presets" USING "btree" ("org_id", "kind", "value");



CREATE UNIQUE INDEX "presets_orgless_unique" ON "public"."presets" USING "btree" ("kind", "value") WHERE ("org_id" IS NULL);



CREATE UNIQUE INDEX "settings_org_id_key" ON "public"."settings" USING "btree" ("org_id");



CREATE INDEX "staff_training_areas_org_ini_idx" ON "public"."staff_training_areas" USING "btree" ("org_id", "staff_initials");



CREATE INDEX "suppliers_name_idx" ON "public"."suppliers" USING "btree" ("name");



CREATE INDEX "suppliers_org_active_idx" ON "public"."suppliers" USING "btree" ("org_id", "active");



CREATE INDEX "suppliers_org_idx" ON "public"."suppliers" USING "btree" ("org_id");



CREATE UNIQUE INDEX "team_members_created_by_initials_unique" ON "public"."team_members" USING "btree" ("created_by", "upper"("initials"));



CREATE INDEX "team_members_org_email_idx" ON "public"."team_members" USING "btree" ("org_id", "lower"("email"));



CREATE INDEX "team_members_user_id_idx" ON "public"."team_members" USING "btree" ("user_id");



CREATE INDEX "team_org_active_idx" ON "public"."team" USING "btree" ("org_id", "active");



CREATE INDEX "temp_logs_date_desc" ON "public"."temp_logs" USING "btree" ("date" DESC);



CREATE INDEX "temp_logs_org_date" ON "public"."temp_logs" USING "btree" ("org_id", "date" DESC);



CREATE INDEX "temp_logs_org_date_idx" ON "public"."temp_logs" USING "btree" ("org_id", "date");



CREATE INDEX "temp_logs_org_time_idx" ON "public"."temp_logs" USING "btree" ("org_id", "time_iso" DESC);



CREATE UNIQUE INDEX "ux_tri_routine_loc_item_target" ON "public"."temp_routine_items" USING "btree" ("routine_id", "location", "item", "target_key");



CREATE OR REPLACE TRIGGER "billing_subscriptions_set_updated_at" BEFORE UPDATE ON "public"."billing_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "review_dismissals_set_updated_at" BEFORE UPDATE ON "public"."review_dismissals" FOR EACH ROW EXECUTE FUNCTION "public"."set_current_timestamp_updated_at"();



CREATE OR REPLACE TRIGGER "seed_cleaning_tasks_on_location_insert" AFTER INSERT ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."trg_seed_cleaning_tasks_on_location_insert"();



CREATE OR REPLACE TRIGGER "tr_set_created_by" BEFORE INSERT ON "public"."temp_routines" FOR EACH ROW EXECUTE FUNCTION "public"."tr_fill_created_by"();



CREATE OR REPLACE TRIGGER "trg_fill_cleaning_logs_calendar" BEFORE INSERT OR UPDATE ON "public"."cleaning_logs" FOR EACH ROW EXECUTE FUNCTION "public"."fill_cleaning_logs_calendar"();



CREATE OR REPLACE TRIGGER "trg_food_temp_logs_autofill" BEFORE INSERT ON "public"."food_temp_logs" FOR EACH ROW EXECUTE FUNCTION "public"."food_temp_logs_autofill"();



CREATE OR REPLACE TRIGGER "trg_org_onboarding_updated" BEFORE UPDATE ON "public"."org_onboarding" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_points_cleaning" AFTER INSERT ON "public"."cleaning_logs" FOR EACH ROW EXECUTE FUNCTION "public"."give_points_for_cleaning_log"();



CREATE OR REPLACE TRIGGER "trg_points_temp" AFTER INSERT ON "public"."temp_logs" FOR EACH ROW EXECUTE FUNCTION "public"."give_points_for_temp_log"();



CREATE OR REPLACE TRIGGER "trg_restrict_kitchen_wall" BEFORE UPDATE ON "public"."kitchen_wall" FOR EACH ROW EXECUTE FUNCTION "public"."restrict_kitchen_wall_updates"();



CREATE OR REPLACE TRIGGER "trg_set_org_id_feedback_items" BEFORE INSERT ON "public"."feedback_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_id_from_profile"();



CREATE OR REPLACE TRIGGER "trg_set_org_id_food" BEFORE INSERT ON "public"."food_temp_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_id_from_profile"();



CREATE OR REPLACE TRIGGER "trg_set_org_id_food_temp_corrective" BEFORE INSERT ON "public"."food_temp_corrective_actions" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_id_from_profile"();



CREATE OR REPLACE TRIGGER "trg_set_org_id_suppliers" BEFORE INSERT ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_id_from_profile"();



CREATE OR REPLACE TRIGGER "trg_set_org_id_trainings" BEFORE INSERT ON "public"."trainings" FOR EACH ROW EXECUTE FUNCTION "public"."set_org_id_from_profile"();



CREATE OR REPLACE TRIGGER "trg_set_temp_log_date" BEFORE INSERT OR UPDATE OF "created_at" ON "public"."temp_logs" FOR EACH ROW EXECUTE FUNCTION "public"."trg_set_temp_log_date"();



CREATE OR REPLACE TRIGGER "trg_settings_singleton" BEFORE INSERT OR UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."settings_set_singleton"();



CREATE OR REPLACE TRIGGER "trg_team_member_training_set_updated_at" BEFORE UPDATE ON "public"."team_member_training_areas" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_team_members_training_areas_normalize" BEFORE INSERT OR UPDATE ON "public"."team_members" FOR EACH ROW EXECUTE FUNCTION "public"."team_members_training_areas_normalize"();



CREATE OR REPLACE TRIGGER "trg_team_training_area_status_updated_at" BEFORE UPDATE ON "public"."team_training_area_status" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_temp_logs_set_date" BEFORE INSERT OR UPDATE OF "created_at" ON "public"."temp_logs" FOR EACH ROW EXECUTE FUNCTION "public"."temp_logs_set_date"();



CREATE OR REPLACE TRIGGER "trg_temp_routines_updated_at" BEFORE UPDATE ON "public"."temp_routines" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_trainings_updated_at" BEFORE UPDATE ON "public"."trainings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."allergen_change_logs"
    ADD CONSTRAINT "allergen_change_logs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."allergen_flags"
    ADD CONSTRAINT "allergen_flags_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."allergen_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."allergen_reviews"
    ADD CONSTRAINT "allergen_reviews_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_customers"
    ADD CONSTRAINT "billing_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_subscriptions"
    ADD CONSTRAINT "billing_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_logs"
    ADD CONSTRAINT "cleaning_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."cleaning_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_task_categories"
    ADD CONSTRAINT "cleaning_task_categories_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cleaning_task_runs"
    ADD CONSTRAINT "cleaning_task_runs_done_by_team_member_fkey" FOREIGN KEY ("done_by_team_member_id") REFERENCES "public"."team_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cleaning_tasks"
    ADD CONSTRAINT "cleaning_tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."cleaning_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."temp_logs"
    ADD CONSTRAINT "fk_temp_logs_org" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_hygiene_ratings"
    ADD CONSTRAINT "food_hygiene_ratings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."food_hygiene_ratings"
    ADD CONSTRAINT "food_hygiene_ratings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_temp_corrective_actions"
    ADD CONSTRAINT "food_temp_corrective_actions_temp_log_id_fkey" FOREIGN KEY ("temp_log_id") REFERENCES "public"."food_temp_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_temp_log_amendments"
    ADD CONSTRAINT "food_temp_log_amendments_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "public"."food_temp_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kitchen_wall"
    ADD CONSTRAINT "kitchen_wall_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kitchen_wall"
    ADD CONSTRAINT "kitchen_wall_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presets"
    ADD CONSTRAINT "presets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."presets"
    ADD CONSTRAINT "presets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."staff_profiles"
    ADD CONSTRAINT "staff_profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_qc_reviews"
    ADD CONSTRAINT "staff_qc_reviews_location_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_qc_reviews"
    ADD CONSTRAINT "staff_qc_reviews_manager_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."team_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_qc_reviews"
    ADD CONSTRAINT "staff_qc_reviews_staff_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."team_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_reviews"
    ADD CONSTRAINT "staff_reviews_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_reviews"
    ADD CONSTRAINT "staff_reviews_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_training"
    ADD CONSTRAINT "staff_training_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."staff_training"
    ADD CONSTRAINT "staff_training_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_training"
    ADD CONSTRAINT "staff_training_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_training"
    ADD CONSTRAINT "staff_training_training_type_id_fkey" FOREIGN KEY ("training_type_id") REFERENCES "public"."training_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_member_training_areas"
    ADD CONSTRAINT "team_member_training_areas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."team_member_training_areas"
    ADD CONSTRAINT "team_member_training_areas_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."team"
    ADD CONSTRAINT "team_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_training_area_status"
    ADD CONSTRAINT "team_training_area_status_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."temp_corrective_actions"
    ADD CONSTRAINT "temp_corrective_actions_temp_log_id_fkey" FOREIGN KEY ("temp_log_id") REFERENCES "public"."food_temp_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."temp_logs"
    ADD CONSTRAINT "temp_logs_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."temp_logs"
    ADD CONSTRAINT "temp_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."temp_routine_items"
    ADD CONSTRAINT "temp_routine_items_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."temp_routines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."training_types"
    ADD CONSTRAINT "training_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."training_types"
    ADD CONSTRAINT "training_types_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trainings"
    ADD CONSTRAINT "trainings_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_orgs"
    ADD CONSTRAINT "user_orgs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_orgs"
    ADD CONSTRAINT "user_orgs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allergen reviews managed by managers" ON "public"."allergen_reviews" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "allergen_reviews"."organisation_id") AND COALESCE("tm"."active", true) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'admin'::"text"])) AND ("lower"("tm"."email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "allergen_reviews"."organisation_id") AND COALESCE("tm"."active", true) AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'admin'::"text"])) AND ("lower"("tm"."email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))))));



CREATE POLICY "Allergen reviews visible to org members" ON "public"."allergen_reviews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "allergen_reviews"."organisation_id") AND COALESCE("tm"."active", true) AND ("lower"("tm"."email") = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")))))));



CREATE POLICY "Managers can delete team" ON "public"."team_members" FOR DELETE USING ("public"."is_manager_of"("org_id", COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")));



CREATE POLICY "Managers can edit team" ON "public"."team_members" FOR UPDATE USING ("public"."is_manager_of"("org_id", COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")));



CREATE POLICY "Managers can insert team" ON "public"."team_members" FOR INSERT WITH CHECK ("public"."is_manager_of"("org_id", COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")));



CREATE POLICY "Points visible to org members" ON "public"."points_events" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "user_orgs"."org_id"
   FROM "public"."user_orgs"
  WHERE ("user_orgs"."user_id" = "auth"."uid"()))));



CREATE POLICY "Profiles are selectable by owner" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Profiles are updatable by owner (limited)" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Team visible to org members" ON "public"."team_members" FOR SELECT USING ("public"."is_member_of"("org_id", COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")));



CREATE POLICY "Users can view own billing customer row" ON "public"."billing_customers" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own billing subscriptions" ON "public"."billing_subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage their own memberships" ON "public"."user_orgs" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "admin update profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['manager'::"text", 'owner'::"text"]))))));



ALTER TABLE "public"."allergen_change_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allergen_change_logs_rw_for_org" ON "public"."allergen_change_logs" TO "authenticated" USING (("org_id" IN ( SELECT "team_members"."org_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"())))) WITH CHECK (("org_id" IN ( SELECT "team_members"."org_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."allergen_flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."allergen_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."allergen_matrix" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."allergen_review" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."allergen_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allergen_reviews_all" ON "public"."allergen_reviews" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "allergens: insert staff+" ON "public"."allergen_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "allergen_items"."org_id")))));



CREATE POLICY "allergens: read" ON "public"."allergen_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "allergen_items"."org_id")))));



CREATE POLICY "allergens: update manager+" ON "public"."allergen_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "allergen_items"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))) WITH CHECK (true);



CREATE POLICY "allow_all_categories" ON "public"."cleaning_categories" USING (true) WITH CHECK (true);



CREATE POLICY "allow_all_runs" ON "public"."cleaning_task_runs" USING (true) WITH CHECK (true);



CREATE POLICY "allow_authenticated_insert" ON "public"."organisations" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "auth users manage flags" ON "public"."allergen_flags" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."billing_customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_customers service_role all" ON "public"."billing_customers" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."billing_subscriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_subscriptions service_role all" ON "public"."billing_subscriptions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "clean_tasks_manage" ON "public"."cleaning_tasks" USING (("public"."is_org_manager"("org_id") = true)) WITH CHECK (("public"."is_org_manager"("org_id") = true));



CREATE POLICY "clean_tasks_read" ON "public"."cleaning_tasks" FOR SELECT USING (("public"."is_org_member"("org_id") = true));



ALTER TABLE "public"."cleaning_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleaning_incidents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleaning_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleaning_task_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleaning_task_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cleaning_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_checks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "compliance_checks_org_delete" ON "public"."compliance_checks" FOR DELETE USING (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



CREATE POLICY "compliance_checks_org_read" ON "public"."compliance_checks" FOR SELECT USING (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



CREATE POLICY "compliance_checks_org_update" ON "public"."compliance_checks" FOR UPDATE USING (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text"))) WITH CHECK (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



CREATE POLICY "compliance_checks_org_write" ON "public"."compliance_checks" FOR INSERT WITH CHECK (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



ALTER TABLE "public"."daily_signoffs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "daily_signoffs_insert_org" ON "public"."daily_signoffs" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "daily_signoffs_org_read" ON "public"."daily_signoffs" FOR SELECT USING (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



CREATE POLICY "daily_signoffs_org_update" ON "public"."daily_signoffs" FOR UPDATE USING (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text"))) WITH CHECK (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



CREATE POLICY "daily_signoffs_org_write" ON "public"."daily_signoffs" FOR INSERT WITH CHECK (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



CREATE POLICY "daily_signoffs_select_org" ON "public"."daily_signoffs" FOR SELECT TO "authenticated" USING (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "daily_signoffs_update_org" ON "public"."daily_signoffs" FOR UPDATE TO "authenticated" USING (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())
 LIMIT 1))) WITH CHECK (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())
 LIMIT 1)));



CREATE POLICY "delete own org" ON "public"."staff_training_areas" FOR DELETE USING (true);



CREATE POLICY "delete temps same org" ON "public"."food_temps" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "food_temps"."org_id")))));



CREATE POLICY "dev temp_routine_items delete" ON "public"."temp_routine_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "dev temp_routine_items insert" ON "public"."temp_routine_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "dev temp_routine_items select" ON "public"."temp_routine_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dev temp_routine_items update" ON "public"."temp_routine_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "dev temp_routines delete" ON "public"."temp_routines" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "dev temp_routines insert" ON "public"."temp_routines" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "dev temp_routines select" ON "public"."temp_routines" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dev temp_routines update" ON "public"."temp_routines" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "feedback_delete_owner_admin" ON "public"."feedback_items" FOR DELETE TO "authenticated" USING (("auth"."uid"() = 'ae9dde44-35bf-4045-984f-cef2cae3359b'::"uuid"));



CREATE POLICY "feedback_delete_owner_only" ON "public"."feedback_items" FOR DELETE TO "authenticated" USING (("auth"."uid"() = 'ae9dde44-35bf-4045-984f-cef2cae3359b'::"uuid"));



CREATE POLICY "feedback_delete_superadmin" ON "public"."feedback_items" FOR DELETE TO "authenticated" USING (("auth"."uid"() = 'ae9dde44-35bf-4045-984f-cef2cae3359b'::"uuid"));



CREATE POLICY "feedback_insert_own" ON "public"."feedback_items" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."feedback_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_select_owner_admin" ON "public"."feedback_items" FOR SELECT TO "authenticated" USING (("auth"."uid"() = 'ae9dde44-35bf-4045-984f-cef2cae3359b'::"uuid"));



CREATE POLICY "feedback_select_owner_only" ON "public"."feedback_items" FOR SELECT TO "authenticated" USING (("auth"."uid"() = 'ae9dde44-35bf-4045-984f-cef2cae3359b'::"uuid"));



CREATE POLICY "feedback_select_superadmin" ON "public"."feedback_items" FOR SELECT TO "authenticated" USING (("auth"."uid"() = 'ae9dde44-35bf-4045-984f-cef2cae3359b'::"uuid"));



ALTER TABLE "public"."food_hygiene_ratings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "food_hygiene_ratings_read_org_members" ON "public"."food_hygiene_ratings" FOR SELECT USING ("public"."is_member_of"("org_id", COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")));



CREATE POLICY "food_hygiene_ratings_write_org_managers" ON "public"."food_hygiene_ratings" USING ("public"."is_current_user_org_manager"("org_id")) WITH CHECK ("public"."is_current_user_org_manager"("org_id"));



CREATE POLICY "food_logs_select" ON "public"."food_temp_logs" FOR SELECT USING (("public"."is_org_member"("org_id") = true));



CREATE POLICY "food_logs_write" ON "public"."food_temp_logs" USING (("public"."is_org_member"("org_id") = true)) WITH CHECK (("public"."is_org_member"("org_id") = true));



ALTER TABLE "public"."food_temp_corrective_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."food_temp_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."food_temps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incidents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "incidents_delete_org" ON "public"."incidents" FOR DELETE TO "authenticated" USING (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "incidents_insert_org" ON "public"."incidents" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "incidents_insert_same_org" ON "public"."incidents" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = ( SELECT ("profiles"."org_id")::"text" AS "org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "incidents_org_read" ON "public"."incidents" FOR SELECT USING (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



CREATE POLICY "incidents_org_write" ON "public"."incidents" FOR INSERT WITH CHECK (("org_id" = COALESCE((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'org_id'::"text"), (("auth"."jwt"() -> 'app_metadata'::"text") ->> 'org_id'::"text"), ("auth"."uid"())::"text")));



CREATE POLICY "incidents_select_org" ON "public"."incidents" FOR SELECT TO "authenticated" USING (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "incidents_select_same_org" ON "public"."incidents" FOR SELECT TO "authenticated" USING (("org_id" = ( SELECT ("profiles"."org_id")::"text" AS "org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "incidents_update_org" ON "public"."incidents" FOR UPDATE TO "authenticated" USING (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())))) WITH CHECK (("org_id" = ( SELECT ("p"."org_id")::"text" AS "org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "insert flags" ON "public"."allergen_flags" FOR INSERT WITH CHECK (true);



CREATE POLICY "insert items" ON "public"."allergen_items" FOR INSERT WITH CHECK (true);



CREATE POLICY "insert location logs" ON "public"."food_temp_logs" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."org_id" = "food_temp_logs"."org_id"))));



CREATE POLICY "insert logs" ON "public"."temp_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "insert membership (owner only)" ON "public"."user_orgs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."org_id" = "user_orgs"."org_id") AND ("uo"."user_id" = "auth"."uid"()) AND ("uo"."role" = 'owner'::"text")))));



CREATE POLICY "insert my org logs" ON "public"."temp_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."org_id" = "temp_logs"."org_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "insert own org allergen matrix" ON "public"."allergen_matrix" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "allergen_matrix"."org_id")))));



CREATE POLICY "insert own org cleaning tasks" ON "public"."cleaning_tasks" FOR INSERT TO "authenticated" WITH CHECK (("org_id" IN ( SELECT "user_orgs"."org_id"
   FROM "public"."user_orgs"
  WHERE (("user_orgs"."user_id" = "auth"."uid"()) AND ("user_orgs"."active" = true)))));



CREATE POLICY "insert own org dismissals" ON "public"."review_dismissals" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "insert own org food logs" ON "public"."food_temp_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "food_temp_logs"."org_id")))));



CREATE POLICY "insert suppliers" ON "public"."suppliers" FOR INSERT WITH CHECK (true);



CREATE POLICY "insert temp logs" ON "public"."temp_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "insert temps same org" ON "public"."food_temps" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "food_temps"."org_id")))));



CREATE POLICY "insert_own_org_corrective" ON "public"."food_temp_corrective_actions" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."kitchen_wall" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kitchen_wall_insert" ON "public"."kitchen_wall" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."org_id" = "kitchen_wall"."org_id")))));



CREATE POLICY "kitchen_wall_pin" ON "public"."kitchen_wall" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."org_id" = "kitchen_wall"."org_id") AND ("tm"."role" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'admin'::"text"]))))));



CREATE POLICY "kitchen_wall_react" ON "public"."kitchen_wall" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."org_id" = "kitchen_wall"."org_id")))));



CREATE POLICY "kitchen_wall_read" ON "public"."kitchen_wall" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."user_id" = "auth"."uid"()) AND ("tm"."org_id" = "kitchen_wall"."org_id")))));



CREATE POLICY "location access" ON "public"."food_temp_logs" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."org_id" = "food_temp_logs"."org_id"))));



ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "locations_read_org_members" ON "public"."locations" FOR SELECT USING ("public"."is_member_of"("org_id", COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text")));



CREATE POLICY "locations_write_org_managers" ON "public"."locations" USING ("public"."is_current_user_org_manager"("org_id")) WITH CHECK ("public"."is_current_user_org_manager"("org_id"));



CREATE POLICY "logs_del_org_members" ON "public"."cleaning_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_logs"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "logs_ins_org_members" ON "public"."cleaning_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_logs"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "logs_sel_org_members" ON "public"."cleaning_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_logs"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "logs_upd_org_members" ON "public"."cleaning_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_logs"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_logs"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "manage own memberships (owner only creates others)" ON "public"."user_orgs" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_orgs" "me"
  WHERE (("me"."user_id" = "auth"."uid"()) AND ("me"."org_id" = "user_orgs"."org_id") AND ("me"."role" = 'owner'::"text"))))));



CREATE POLICY "manager update" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "me"
  WHERE (("me"."user_id" = "auth"."uid"()) AND ("me"."role" = ANY (ARRAY['owner'::"text", 'manager'::"text"]))))));



CREATE POLICY "mod_own" ON "public"."allergen_review" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "mod_own" ON "public"."food_temp_logs" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."organisations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orgs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orgs: allow all for now" ON "public"."orgs" USING (true) WITH CHECK (true);



CREATE POLICY "owner manage roles" ON "public"."user_roles" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'owner'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'owner'::"text")))));



ALTER TABLE "public"."points_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."presets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "presets: delete manager+" ON "public"."presets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "presets"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"]))))));



CREATE POLICY "presets: insert staff+" ON "public"."presets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "presets"."org_id")))));



CREATE POLICY "presets: read in org" ON "public"."presets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "presets"."org_id")))));



CREATE POLICY "presets: update manager+" ON "public"."presets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "presets"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))) WITH CHECK (true);



CREATE POLICY "presets_anon_select_null_org" ON "public"."presets" FOR SELECT TO "anon" USING (("org_id" IS NULL));



CREATE POLICY "presets_auth_select_own_or_null" ON "public"."presets" FOR SELECT TO "authenticated" USING ((("org_id" IS NULL) OR ("org_id" = "public"."auth_current_org"())));



CREATE POLICY "presets_read_same_org_or_global" ON "public"."presets" FOR SELECT TO "authenticated" USING ((("org_id" IS NULL) OR ((("auth"."jwt"() ->> 'org_id'::"text"))::"uuid" = "org_id")));



CREATE POLICY "presets_select" ON "public"."presets" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles insert own row" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles insert self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles read for authenticated" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles select" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_manager"()));



CREATE POLICY "profiles update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_manager"())) WITH CHECK ((("id" = "auth"."uid"()) OR "public"."is_manager"()));



CREATE POLICY "profiles update own row" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles: self" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_read_own" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_read_self_or_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['manager'::"text", 'owner'::"text"]))));



CREATE POLICY "profiles_select_authenticated" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_select_self_or_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "profiles_select_self_or_admin_jwt" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = ANY ('{manager,owner}'::"text"[]))));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "read all temp logs" ON "public"."temp_logs" FOR SELECT USING (true);



CREATE POLICY "read cleaning task categories" ON "public"."cleaning_task_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read flags" ON "public"."allergen_flags" FOR SELECT USING (true);



CREATE POLICY "read items" ON "public"."allergen_items" FOR SELECT USING (true);



CREATE POLICY "read logs" ON "public"."temp_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read own memberships" ON "public"."user_orgs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "read own org" ON "public"."food_temp_logs" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "user_orgs"."org_id"
   FROM "public"."user_orgs"
  WHERE ("user_orgs"."user_id" = "auth"."uid"()))));



CREATE POLICY "read own org" ON "public"."staff_training_areas" FOR SELECT USING (true);



CREATE POLICY "read own org allergen matrix" ON "public"."allergen_matrix" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "allergen_matrix"."org_id")))));



CREATE POLICY "read own org cleaning tasks" ON "public"."cleaning_tasks" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "user_orgs"."org_id"
   FROM "public"."user_orgs"
  WHERE (("user_orgs"."user_id" = "auth"."uid"()) AND ("user_orgs"."active" = true)))));



CREATE POLICY "read own org dismissals" ON "public"."review_dismissals" FOR SELECT TO "authenticated" USING (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "read own org food logs" ON "public"."food_temp_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "food_temp_logs"."org_id")))));



CREATE POLICY "read own organisation" ON "public"."organisations" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "user_orgs"."org_id"
   FROM "public"."user_orgs"
  WHERE ("user_orgs"."user_id" = "auth"."uid"()))));



CREATE POLICY "read own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "read own role" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "read suppliers" ON "public"."suppliers" FOR SELECT USING (true);



CREATE POLICY "read temps same org" ON "public"."food_temps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "food_temps"."org_id")))));



CREATE POLICY "read_own_profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "read_settings" ON "public"."settings" FOR SELECT USING (true);



ALTER TABLE "public"."review_dismissals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "review_dismissals_select_org" ON "public"."review_dismissals" FOR SELECT TO "authenticated" USING (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "review_dismissals_update_org" ON "public"."review_dismissals" FOR UPDATE TO "authenticated" USING (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "review_dismissals_upsert_org" ON "public"."review_dismissals" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "routine_items_manage" ON "public"."temp_routine_items" USING ((EXISTS ( SELECT 1
   FROM "public"."temp_routines" "r"
  WHERE (("r"."id" = "temp_routine_items"."routine_id") AND ("public"."is_org_member"("r"."org_id") = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."temp_routines" "r"
  WHERE (("r"."id" = "temp_routine_items"."routine_id") AND ("public"."is_org_manager"("r"."org_id") = true)))));



CREATE POLICY "routines_delete_own" ON "public"."temp_routines" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "routines_insert_own" ON "public"."temp_routines" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "routines_manage" ON "public"."temp_routines" USING (("public"."is_org_manager"("org_id") = true)) WITH CHECK (("public"."is_org_manager"("org_id") = true));



CREATE POLICY "routines_read" ON "public"."temp_routines" FOR SELECT USING (("public"."is_org_member"("org_id") = true));



CREATE POLICY "routines_select_own" ON "public"."temp_routines" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "routines_update_own" ON "public"."temp_routines" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "sel_own" ON "public"."allergen_review" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "sel_own" ON "public"."food_temp_logs" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "select my memberships" ON "public"."user_orgs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "select my org logs" ON "public"."temp_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."org_id" = "temp_logs"."org_id") AND ("uo"."user_id" = "auth"."uid"())))));



CREATE POLICY "select routine items for org members" ON "public"."temp_routine_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."temp_routines" "r"
     JOIN "public"."user_orgs" "m" ON ((("m"."org_id" = "r"."org_id") AND ("m"."user_id" = "auth"."uid"()))))
  WHERE ("r"."id" = "temp_routine_items"."routine_id"))));



CREATE POLICY "select routines for org members" ON "public"."temp_routines" FOR SELECT TO "authenticated" USING (("org_id" IN ( SELECT "m"."org_id"
   FROM "public"."user_orgs" "m"
  WHERE ("m"."user_id" = "auth"."uid"()))));



CREATE POLICY "select_own_org_corrective" ON "public"."food_temp_corrective_actions" FOR SELECT TO "authenticated" USING (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "self insert" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "self update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "service role full access profiles" ON "public"."profiles" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "st_del_by_org" ON "public"."staff_training" FOR DELETE TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "st_ins_by_org" ON "public"."staff_training" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "st_select_by_org" ON "public"."staff_training" FOR SELECT TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "st_upd_by_org" ON "public"."staff_training" FOR UPDATE TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))))) WITH CHECK (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_all" ON "public"."staff" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."staff_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_profiles: select in org" ON "public"."staff_profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "staff_profiles"."org_id")))));



CREATE POLICY "staff_profiles: write manager+" ON "public"."staff_profiles" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "staff_profiles"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))) WITH CHECK (true);



ALTER TABLE "public"."staff_training" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_training: select in org" ON "public"."staff_training" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "staff_training"."org_id")))));



CREATE POLICY "staff_training: write manager+" ON "public"."staff_training" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "staff_training"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))) WITH CHECK (true);



ALTER TABLE "public"."staff_training_areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers all auth" ON "public"."suppliers" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "suppliers delete all" ON "public"."suppliers" FOR DELETE USING (true);



CREATE POLICY "suppliers read all" ON "public"."suppliers" FOR SELECT USING (true);



CREATE POLICY "suppliers read by managers" ON "public"."suppliers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['owner'::"text", 'manager'::"text"]))))));



CREATE POLICY "suppliers update all" ON "public"."suppliers" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "suppliers write all" ON "public"."suppliers" FOR INSERT WITH CHECK (true);



CREATE POLICY "suppliers: insert staff+" ON "public"."suppliers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "suppliers"."org_id")))));



CREATE POLICY "suppliers: read" ON "public"."suppliers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "suppliers"."org_id")))));



CREATE POLICY "suppliers: update manager+" ON "public"."suppliers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "suppliers"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))) WITH CHECK (true);



CREATE POLICY "suppliers_delete" ON "public"."suppliers" FOR DELETE USING (("org_id" = "public"."auth_org_id"()));



CREATE POLICY "suppliers_insert" ON "public"."suppliers" FOR INSERT WITH CHECK (("org_id" = "public"."auth_org_id"()));



CREATE POLICY "suppliers_manage" ON "public"."suppliers" USING (("public"."is_org_manager"("org_id") = true)) WITH CHECK (("public"."is_org_manager"("org_id") = true));



CREATE POLICY "suppliers_modify" ON "public"."suppliers" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (true);



CREATE POLICY "suppliers_modify_same_org" ON "public"."suppliers" TO "authenticated" USING (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())))) WITH CHECK (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "suppliers_read" ON "public"."suppliers" FOR SELECT USING (("public"."is_org_member"("org_id") = true));



CREATE POLICY "suppliers_read_own_org" ON "public"."suppliers" FOR SELECT USING (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "suppliers_select" ON "public"."suppliers" FOR SELECT USING (("org_id" = "public"."auth_org_id"()));



CREATE POLICY "suppliers_select_same_org" ON "public"."suppliers" FOR SELECT USING (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "suppliers_update" ON "public"."suppliers" FOR UPDATE USING (("org_id" = "public"."auth_org_id"()));



CREATE POLICY "suppliers_write_admin_only" ON "public"."suppliers" USING ((("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"))) WITH CHECK (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "tasks_del_org_members" ON "public"."cleaning_tasks" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_tasks"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "tasks_ins_org_members" ON "public"."cleaning_tasks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_tasks"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "tasks_sel_org_members" ON "public"."cleaning_tasks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_tasks"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



CREATE POLICY "tasks_upd_org_members" ON "public"."cleaning_tasks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_tasks"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."org_id" = "cleaning_tasks"."org_id") AND ("lower"("tm"."email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))))));



ALTER TABLE "public"."team" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team read by managers" ON "public"."team" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['owner'::"text", 'manager'::"text"]))))));



CREATE POLICY "team_delete" ON "public"."team" FOR DELETE USING (("org_id" = "public"."auth_org_id"()));



CREATE POLICY "team_insert" ON "public"."team" FOR INSERT WITH CHECK (("org_id" = "public"."auth_org_id"()));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_members_self_insert" ON "public"."team_members" FOR INSERT TO "authenticated" WITH CHECK (("lower"(COALESCE("email", ''::"text")) = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))));



CREATE POLICY "team_modify_same_org" ON "public"."team" TO "authenticated" USING (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())))) WITH CHECK (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "team_read_own_org" ON "public"."team" FOR SELECT USING (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "team_read_self_or_org_managers" ON "public"."team_members" FOR SELECT USING ((("lower"(COALESCE("email", ''::"text")) = "lower"(COALESCE(("auth"."jwt"() ->> 'email'::"text"), ''::"text"))) OR "public"."is_current_user_org_manager"("org_id")));



CREATE POLICY "team_select" ON "public"."team" FOR SELECT USING (("org_id" = "public"."auth_org_id"()));



CREATE POLICY "team_select_same_org" ON "public"."team" FOR SELECT USING (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "team_update" ON "public"."team" FOR UPDATE USING (("org_id" = "public"."auth_org_id"()));



CREATE POLICY "team_write_admin_only" ON "public"."team" USING ((("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"))) WITH CHECK (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "team_write_org_managers" ON "public"."team_members" USING ("public"."is_current_user_org_manager"("org_id")) WITH CHECK ("public"."is_current_user_org_manager"("org_id"));



ALTER TABLE "public"."temp_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "temp_logs: delete manager+" ON "public"."temp_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"]))))));



CREATE POLICY "temp_logs: insert staff+" ON "public"."temp_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id")))));



CREATE POLICY "temp_logs: read in org" ON "public"."temp_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id")))));



CREATE POLICY "temp_logs: update manager+" ON "public"."temp_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))) WITH CHECK (true);



CREATE POLICY "temp_logs_auth_select_own_or_null" ON "public"."temp_logs" FOR SELECT TO "authenticated" USING ((("org_id" IS NULL) OR ("org_id" = "public"."auth_current_org"())));



CREATE POLICY "temp_logs_delete" ON "public"."temp_logs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "temp_logs_insert" ON "public"."temp_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "temp_logs_modify" ON "public"."temp_logs" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "temp_logs_select" ON "public"."temp_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "temp_logs_update" ON "public"."temp_logs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."temp_routine_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."temp_routines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "temp_routines delete own" ON "public"."temp_routines" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "temp_routines insert own" ON "public"."temp_routines" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "temp_routines select own" ON "public"."temp_routines" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "temp_routines update own" ON "public"."temp_routines" FOR UPDATE USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "templogs_delete_by_org" ON "public"."temp_logs" FOR DELETE TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "templogs_insert_by_org" ON "public"."temp_logs" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "templogs_select_by_org" ON "public"."temp_logs" FOR SELECT TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "templogs_update_by_org" ON "public"."temp_logs" FOR UPDATE TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))))) WITH CHECK (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "tl_delete_own_org" ON "public"."temp_logs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id")))));



CREATE POLICY "tl_insert_own_org" ON "public"."temp_logs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id")))));



CREATE POLICY "tl_select_own_org" ON "public"."temp_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id")))));



CREATE POLICY "tl_update_own_org" ON "public"."temp_logs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "temp_logs"."org_id")))));



CREATE POLICY "tr_cud" ON "public"."temp_routines" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "tr_del" ON "public"."temp_routines" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR (("org_id" IS NOT NULL) AND ("org_id" = "public"."jwt_org_id"()))));



CREATE POLICY "tr_ins" ON "public"."temp_routines" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) OR (("org_id" IS NOT NULL) AND ("org_id" = "public"."jwt_org_id"()))));



CREATE POLICY "tr_mod" ON "public"."temp_routines" USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "tr_sel" ON "public"."temp_routines" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "tr_select" ON "public"."temp_routines" FOR SELECT USING (("created_by" = "auth"."uid"()));



CREATE POLICY "tr_upd" ON "public"."temp_routines" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (("org_id" IS NOT NULL) AND ("org_id" = "public"."jwt_org_id"())))) WITH CHECK ((("created_by" = "auth"."uid"()) OR (("org_id" IS NOT NULL) AND ("org_id" = "public"."jwt_org_id"()))));



ALTER TABLE "public"."training_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_types: select in org" ON "public"."training_types" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "training_types"."org_id")))));



CREATE POLICY "training_types: write manager+" ON "public"."training_types" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."org_id" = "training_types"."org_id") AND ("p"."role" = ANY (ARRAY['manager'::"text", 'admin'::"text"])))))) WITH CHECK (true);



ALTER TABLE "public"."trainings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trainings_all" ON "public"."trainings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "tri_cud" ON "public"."temp_routine_items" USING ((EXISTS ( SELECT 1
   FROM "public"."temp_routines" "r"
  WHERE (("r"."id" = "temp_routine_items"."routine_id") AND ("r"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."temp_routines" "r"
  WHERE (("r"."id" = "temp_routine_items"."routine_id") AND ("r"."created_by" = "auth"."uid"())))));



CREATE POLICY "tri_mod" ON "public"."temp_routine_items" USING ((EXISTS ( SELECT 1
   FROM "public"."temp_routines" "r"
  WHERE (("r"."id" = "temp_routine_items"."routine_id") AND ("r"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."temp_routines" "r"
  WHERE (("r"."id" = "temp_routine_items"."routine_id") AND ("r"."created_by" = "auth"."uid"())))));



CREATE POLICY "tri_sel" ON "public"."temp_routine_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."temp_routines" "r"
  WHERE (("r"."id" = "temp_routine_items"."routine_id") AND ("r"."created_by" = "auth"."uid"())))));



CREATE POLICY "tri_select" ON "public"."temp_routine_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."temp_routines" "r"
  WHERE (("r"."id" = "temp_routine_items"."routine_id") AND ("r"."created_by" = "auth"."uid"())))));



CREATE POLICY "types_del_by_org" ON "public"."training_types" FOR DELETE TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "types_ins_by_org" ON "public"."training_types" FOR INSERT TO "authenticated" WITH CHECK (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "types_select_by_org" ON "public"."training_types" FOR SELECT TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "types_upd_by_org" ON "public"."training_types" FOR UPDATE TO "authenticated" USING (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))))) WITH CHECK (("org_id" = COALESCE((NULLIF(((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" -> 'user_metadata'::"text") ->> 'org_id'::"text"), ''::"text"))::"uuid", ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "update own org" ON "public"."staff_training_areas" FOR UPDATE USING (true);



CREATE POLICY "update own org allergen matrix" ON "public"."allergen_matrix" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "allergen_matrix"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "allergen_matrix"."org_id")))));



CREATE POLICY "update own org cleaning tasks" ON "public"."cleaning_tasks" FOR UPDATE TO "authenticated" USING (("org_id" IN ( SELECT "user_orgs"."org_id"
   FROM "public"."user_orgs"
  WHERE (("user_orgs"."user_id" = "auth"."uid"()) AND ("user_orgs"."active" = true))))) WITH CHECK (("org_id" IN ( SELECT "user_orgs"."org_id"
   FROM "public"."user_orgs"
  WHERE (("user_orgs"."user_id" = "auth"."uid"()) AND ("user_orgs"."active" = true)))));



CREATE POLICY "update own org dismissals" ON "public"."review_dismissals" FOR UPDATE TO "authenticated" USING (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"())))) WITH CHECK (("org_id" = ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "update own org food logs" ON "public"."food_temp_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "food_temp_logs"."org_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "food_temp_logs"."org_id")))));



CREATE POLICY "update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "update temps same org" ON "public"."food_temps" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_orgs" "uo"
  WHERE (("uo"."user_id" = "auth"."uid"()) AND ("uo"."org_id" = "food_temps"."org_id")))));



CREATE POLICY "update_own_org_corrective" ON "public"."food_temp_corrective_actions" FOR UPDATE TO "authenticated" USING (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("org_id" = ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "update_settings" ON "public"."settings" FOR UPDATE USING (true) WITH CHECK (true);



ALTER TABLE "public"."user_orgs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_orgs_delete" ON "public"."user_orgs" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_orgs_insert" ON "public"."user_orgs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_orgs_select" ON "public"."user_orgs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_orgs_update" ON "public"."user_orgs" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_select" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_roles_self_insert" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_roles_self_update" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "write own org" ON "public"."staff_training_areas" FOR INSERT WITH CHECK (true);



CREATE POLICY "write_settings" ON "public"."settings" FOR INSERT WITH CHECK (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."array_distinct_text"("arr" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."array_distinct_text"("arr" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_distinct_text"("arr" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."auth_current_org"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auth_current_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_current_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_current_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."auth_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_routine"("_routine_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_routine"("_routine_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_routine"("_routine_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_manage_team"("p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_manage_team"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_team"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_team"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_member_role"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_member_role"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_member_role"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_org_role"("target_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."current_org_role"("target_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_org_role"("target_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_email"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_org_ids"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_org_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_org_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_org_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_org_for_user"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_org_for_user"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_org_for_user"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fill_cleaning_logs_calendar"() TO "anon";
GRANT ALL ON FUNCTION "public"."fill_cleaning_logs_calendar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fill_cleaning_logs_calendar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."food_temp_logs_autofill"() TO "anon";
GRANT ALL ON FUNCTION "public"."food_temp_logs_autofill"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."food_temp_logs_autofill"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."give_points_for_cleaning_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."give_points_for_cleaning_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."give_points_for_cleaning_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."give_points_for_temp_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."give_points_for_temp_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."give_points_for_temp_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_link_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_link_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_link_membership"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"("uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_current_user_org_manager"("p_org" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_current_user_org_manager"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_current_user_org_manager"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_current_user_org_manager"("p_org" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_manager"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_manager"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_manager"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_manager_of"("org" "uuid", "user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_manager_of"("org" "uuid", "user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_manager_of"("org" "uuid", "user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member"("p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member"("p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member"("p_org" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_of"("org" "uuid", "user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of"("org" "uuid", "user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of"("org" "uuid", "user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_manager"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_manager"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_manager"("p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."jwt_org_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."jwt_org_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."jwt_org_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."link_user_to_orgs"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_user_to_orgs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_user_to_orgs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."my_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_org"() TO "service_role";



GRANT ALL ON FUNCTION "public"."restrict_kitchen_wall_updates"() TO "anon";
GRANT ALL ON FUNCTION "public"."restrict_kitchen_wall_updates"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."restrict_kitchen_wall_updates"() TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_cleaning_tasks_for_location"("p_org" "uuid", "p_location" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_cleaning_tasks_for_location"("p_org" "uuid", "p_location" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_cleaning_tasks_for_location"("p_org" "uuid", "p_location" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_cleaning_tasks_for_org_location"("p_org_id" "uuid", "p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_cleaning_tasks_for_org_location"("p_org_id" "uuid", "p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_cleaning_tasks_for_org_location"("p_org_id" "uuid", "p_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_org_defaults"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_org_defaults"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_org_defaults"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_current_timestamp_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_org_id_from_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_org_id_from_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_org_id_from_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."settings_set_singleton"() TO "anon";
GRANT ALL ON FUNCTION "public"."settings_set_singleton"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."settings_set_singleton"() TO "service_role";



GRANT ALL ON FUNCTION "public"."team_members_autofill"() TO "anon";
GRANT ALL ON FUNCTION "public"."team_members_autofill"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."team_members_autofill"() TO "service_role";



GRANT ALL ON FUNCTION "public"."team_members_training_areas_normalize"() TO "anon";
GRANT ALL ON FUNCTION "public"."team_members_training_areas_normalize"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."team_members_training_areas_normalize"() TO "service_role";



GRANT ALL ON FUNCTION "public"."temp_logs_set_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."temp_logs_set_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."temp_logs_set_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tr_fill_created_by"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_fill_created_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_fill_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_seed_cleaning_tasks_on_location_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_seed_cleaning_tasks_on_location_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_seed_cleaning_tasks_on_location_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_set_temp_log_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_set_temp_log_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_set_temp_log_date"() TO "service_role";



GRANT ALL ON TABLE "public"."allergen_change_logs" TO "anon";
GRANT ALL ON TABLE "public"."allergen_change_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."allergen_change_logs" TO "service_role";



GRANT ALL ON TABLE "public"."allergen_flags" TO "anon";
GRANT ALL ON TABLE "public"."allergen_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."allergen_flags" TO "service_role";



GRANT ALL ON TABLE "public"."allergen_items" TO "anon";
GRANT ALL ON TABLE "public"."allergen_items" TO "authenticated";
GRANT ALL ON TABLE "public"."allergen_items" TO "service_role";



GRANT ALL ON TABLE "public"."allergen_matrix" TO "anon";
GRANT ALL ON TABLE "public"."allergen_matrix" TO "authenticated";
GRANT ALL ON TABLE "public"."allergen_matrix" TO "service_role";



GRANT ALL ON TABLE "public"."allergen_review" TO "anon";
GRANT ALL ON TABLE "public"."allergen_review" TO "authenticated";
GRANT ALL ON TABLE "public"."allergen_review" TO "service_role";



GRANT ALL ON TABLE "public"."allergen_review_log" TO "anon";
GRANT ALL ON TABLE "public"."allergen_review_log" TO "authenticated";
GRANT ALL ON TABLE "public"."allergen_review_log" TO "service_role";



GRANT ALL ON TABLE "public"."allergen_reviews" TO "anon";
GRANT ALL ON TABLE "public"."allergen_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."allergen_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."billing_customers" TO "anon";
GRANT ALL ON TABLE "public"."billing_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_customers" TO "service_role";



GRANT ALL ON TABLE "public"."billing_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_categories" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cleaning_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cleaning_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cleaning_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_incidents" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_incidents" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_logs" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_logs" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_task_categories" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_task_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_task_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cleaning_task_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cleaning_task_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cleaning_task_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_task_deferrals" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_task_deferrals" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_task_deferrals" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_task_runs" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_task_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_task_runs" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_task_templates" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."cleaning_tasks" TO "anon";
GRANT ALL ON TABLE "public"."cleaning_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaning_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_checks" TO "anon";
GRANT ALL ON TABLE "public"."compliance_checks" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_checks" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."current_member" TO "anon";
GRANT ALL ON TABLE "public"."current_member" TO "authenticated";
GRANT ALL ON TABLE "public"."current_member" TO "service_role";



GRANT ALL ON TABLE "public"."daily_signoffs" TO "anon";
GRANT ALL ON TABLE "public"."daily_signoffs" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_signoffs" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_items" TO "anon";
GRANT ALL ON TABLE "public"."feedback_items" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_items" TO "service_role";



GRANT ALL ON TABLE "public"."food_hygiene_ratings" TO "anon";
GRANT ALL ON TABLE "public"."food_hygiene_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."food_hygiene_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."food_temp_corrective_actions" TO "anon";
GRANT ALL ON TABLE "public"."food_temp_corrective_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."food_temp_corrective_actions" TO "service_role";



GRANT ALL ON TABLE "public"."food_temp_log_amendments" TO "anon";
GRANT ALL ON TABLE "public"."food_temp_log_amendments" TO "authenticated";
GRANT ALL ON TABLE "public"."food_temp_log_amendments" TO "service_role";



GRANT ALL ON TABLE "public"."food_temp_logs" TO "anon";
GRANT ALL ON TABLE "public"."food_temp_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."food_temp_logs" TO "service_role";



GRANT ALL ON TABLE "public"."food_temp_logs_90d" TO "service_role";



GRANT ALL ON TABLE "public"."food_temps" TO "anon";
GRANT ALL ON TABLE "public"."food_temps" TO "authenticated";
GRANT ALL ON TABLE "public"."food_temps" TO "service_role";



GRANT ALL ON TABLE "public"."incidents" TO "anon";
GRANT ALL ON TABLE "public"."incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."incidents" TO "service_role";



GRANT ALL ON TABLE "public"."kitchen_wall" TO "anon";
GRANT ALL ON TABLE "public"."kitchen_wall" TO "authenticated";
GRANT ALL ON TABLE "public"."kitchen_wall" TO "service_role";



GRANT ALL ON TABLE "public"."launch_wall" TO "anon";
GRANT ALL ON TABLE "public"."launch_wall" TO "authenticated";
GRANT ALL ON TABLE "public"."launch_wall" TO "service_role";



GRANT ALL ON TABLE "public"."leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."manager_signoffs" TO "anon";
GRANT ALL ON TABLE "public"."manager_signoffs" TO "authenticated";
GRANT ALL ON TABLE "public"."manager_signoffs" TO "service_role";



GRANT ALL ON TABLE "public"."org_onboarding" TO "anon";
GRANT ALL ON TABLE "public"."org_onboarding" TO "authenticated";
GRANT ALL ON TABLE "public"."org_onboarding" TO "service_role";



GRANT ALL ON TABLE "public"."organisations" TO "anon";
GRANT ALL ON TABLE "public"."organisations" TO "authenticated";
GRANT ALL ON TABLE "public"."organisations" TO "service_role";



GRANT ALL ON TABLE "public"."orgs" TO "anon";
GRANT ALL ON TABLE "public"."orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."orgs" TO "service_role";



GRANT ALL ON TABLE "public"."points_events" TO "anon";
GRANT ALL ON TABLE "public"."points_events" TO "authenticated";
GRANT ALL ON TABLE "public"."points_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."points_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."points_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."points_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."presets" TO "anon";
GRANT ALL ON TABLE "public"."presets" TO "authenticated";
GRANT ALL ON TABLE "public"."presets" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."report_events_90d" TO "anon";
GRANT ALL ON TABLE "public"."report_events_90d" TO "authenticated";
GRANT ALL ON TABLE "public"."report_events_90d" TO "service_role";



GRANT ALL ON TABLE "public"."review_dismissals" TO "anon";
GRANT ALL ON TABLE "public"."review_dismissals" TO "authenticated";
GRANT ALL ON TABLE "public"."review_dismissals" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."staff_profiles" TO "anon";
GRANT ALL ON TABLE "public"."staff_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."staff_qc_reviews" TO "anon";
GRANT ALL ON TABLE "public"."staff_qc_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_qc_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."staff_reviews" TO "anon";
GRANT ALL ON TABLE "public"."staff_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."staff_training" TO "anon";
GRANT ALL ON TABLE "public"."staff_training" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_training" TO "service_role";



GRANT ALL ON TABLE "public"."staff_training_areas" TO "anon";
GRANT ALL ON TABLE "public"."staff_training_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_training_areas" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."team" TO "anon";
GRANT ALL ON TABLE "public"."team" TO "authenticated";
GRANT ALL ON TABLE "public"."team" TO "service_role";



GRANT ALL ON TABLE "public"."team_member_training_areas" TO "anon";
GRANT ALL ON TABLE "public"."team_member_training_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."team_member_training_areas" TO "service_role";



GRANT ALL ON TABLE "public"."team_training_area_status" TO "anon";
GRANT ALL ON TABLE "public"."team_training_area_status" TO "authenticated";
GRANT ALL ON TABLE "public"."team_training_area_status" TO "service_role";



GRANT ALL ON TABLE "public"."temp_corrective_actions" TO "anon";
GRANT ALL ON TABLE "public"."temp_corrective_actions" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_corrective_actions" TO "service_role";



GRANT ALL ON TABLE "public"."temp_logs" TO "anon";
GRANT ALL ON TABLE "public"."temp_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_logs" TO "service_role";



GRANT ALL ON TABLE "public"."temp_routine_items" TO "anon";
GRANT ALL ON TABLE "public"."temp_routine_items" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_routine_items" TO "service_role";



GRANT ALL ON TABLE "public"."temp_routines" TO "anon";
GRANT ALL ON TABLE "public"."temp_routines" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_routines" TO "service_role";



GRANT ALL ON TABLE "public"."training_types" TO "anon";
GRANT ALL ON TABLE "public"."training_types" TO "authenticated";
GRANT ALL ON TABLE "public"."training_types" TO "service_role";



GRANT ALL ON TABLE "public"."trainings" TO "anon";
GRANT ALL ON TABLE "public"."trainings" TO "authenticated";
GRANT ALL ON TABLE "public"."trainings" TO "service_role";



GRANT ALL ON TABLE "public"."user_orgs" TO "anon";
GRANT ALL ON TABLE "public"."user_orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_orgs" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






