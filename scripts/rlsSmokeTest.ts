// scripts/rlsSmokeTest.ts
//
// RLS smoke test using test users.
// Usage:
//   npm run rls:test
//
// Needs ENV:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   RLS_TEST_EMAIL
//   RLS_TEST_PASSWORD
//   RLS_TEST_ORG_ID
// Optional second user:
//   RLS_TEST2_EMAIL
//   RLS_TEST2_PASSWORD
//   RLS_TEST2_ORG_ID

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

type AuthEnv = {
  url: string;
  anonKey: string;
  email: string;
  password: string;
  expectedOrgId: string | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in env.");
  process.exit(1);
}

const PRIMARY: AuthEnv = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  email: process.env.RLS_TEST_EMAIL ?? "",
  password: process.env.RLS_TEST_PASSWORD ?? "",
  expectedOrgId: process.env.RLS_TEST_ORG_ID ?? null,
};

const SECONDARY: AuthEnv | null =
  process.env.RLS_TEST2_EMAIL && process.env.RLS_TEST2_PASSWORD
    ? {
        url: SUPABASE_URL,
        anonKey: SUPABASE_ANON_KEY,
        email: process.env.RLS_TEST2_EMAIL,
        password: process.env.RLS_TEST2_PASSWORD,
        expectedOrgId: process.env.RLS_TEST2_ORG_ID ?? null,
      }
    : null;

if (!PRIMARY.email || !PRIMARY.password) {
  console.error("Missing RLS_TEST_EMAIL or RLS_TEST_PASSWORD in env.");
  process.exit(1);
}

async function runTestsForUser(label: "PRIMARY" | "SECONDARY", cfg: AuthEnv) {
  console.log("====================================================");
  console.log(`🔐 RLS tests for ${label} user: ${cfg.email}`);
  console.log("====================================================");

  const supabase = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false },
  });

  // 1) Sign in
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: cfg.email,
      password: cfg.password,
    });

  if (signInError || !signInData.session) {
    console.error(
      `❌ Failed to sign in test user (${label}):`,
      signInError?.message
    );
    return;
  }

  console.log("✅ Signed in as test user.");

  const authed = createClient(cfg.url, cfg.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${signInData.session.access_token}`,
      },
    },
    auth: { persistSession: false },
  });

  // 2) Find org / role from team_members
  const { data: tmRows, error: tmError } = await authed
    .from("team_members")
    .select("org_id, role, email")
    .eq("email", cfg.email)
    .order("created_at", { ascending: true })
    .limit(1);

  if (tmError || !tmRows?.length) {
    console.error(
      "❌ Could not find team_members row for test user:",
      tmError?.message
    );
    return;
  }

  const { org_id: ORG_ID, role } = tmRows[0] as {
    org_id: string;
    role: string;
  };

  console.log(`✅ test user is in org_id=${ORG_ID}, role=${role}`);

  if (cfg.expectedOrgId && ORG_ID !== cfg.expectedOrgId) {
    console.error(
      `🚨 RLS CONFIG WARNING: test user org_id=${ORG_ID}, but expected=${cfg.expectedOrgId}`
    );
  } else if (cfg.expectedOrgId) {
    console.log("✅ test user org matches expected org_id.");
  }

  // ---------- helpers ----------
  async function assertOnlyOwnOrg(table: string) {
    const { data, error } = await authed
      .from(table)
      .select("id, org_id")
      .limit(50);

    if (error) {
      console.error(`❌ ${table} select failed:`, error.message);
      return;
    }

    const bad = (data ?? []).filter((r: any) => r.org_id !== ORG_ID);
    if (bad.length > 0) {
      console.error(
        `🚨 RLS FAIL: test user can see ${table} rows from other orgs:`,
        bad
      );
    } else {
      console.log(`✅ ${table}: only rows from own org (or empty).`);
    }
  }

  async function assertCannotSeeOtherOrg(table: string) {
    const { data, error } = await authed
      .from(table)
      .select("id, org_id")
      .neq("org_id", ORG_ID)
      .limit(1);

    if (error) {
      console.log(
        `ℹ️ ${table} neq(org_id) query error (OK / RLS-hidden):`,
        error.message
      );
    } else if ((data?.length ?? 0) > 0) {
      console.error(
        `🚨 RLS FAIL: test user can read ${table} where org_id != their org:`,
        data
      );
    } else {
      console.log(`✅ ${table}: cannot see other org_id rows.`);
    }
  }

  // ---------- BASIC TABLES ----------

  await assertOnlyOwnOrg("cleaning_tasks");
  await assertCannotSeeOtherOrg("cleaning_tasks");

  await assertOnlyOwnOrg("food_temp_logs");

  await assertOnlyOwnOrg("team_members");
  await assertCannotSeeOtherOrg("team_members");

  await assertOnlyOwnOrg("locations");
  await assertCannotSeeOtherOrg("locations");

  await assertOnlyOwnOrg("allergen_review");
  await assertCannotSeeOtherOrg("allergen_review");

  await assertOnlyOwnOrg("food_hygiene_ratings");
  await assertCannotSeeOtherOrg("food_hygiene_ratings");

  // ---------- cleaning_task_runs INSERT tests ----------

  // find a location for this org
  const { data: locRows, error: locErr } = await authed
    .from("locations")
    .select("id, org_id")
    .eq("org_id", ORG_ID)
    .limit(1);

  if (locErr) {
    console.error("❌ Failed to fetch locations:", locErr.message);
  }

  const location = locRows?.[0] as { id: string; org_id: string } | undefined;

  if (!location) {
    console.log(
      "⚠️ No locations for this org – skipping cleaning_task_runs insert tests."
    );
  } else {
    const location_id = location.id;

    // find a cleaning_task in this org
    const { data: taskRows, error: taskErr } = await authed
      .from("cleaning_tasks")
      .select("id, org_id")
      .eq("org_id", ORG_ID)
      .limit(1);

    if (taskErr) {
      console.error(
        "❌ Failed to fetch cleaning_tasks for insert test:",
        taskErr.message
      );
    }

    const task = taskRows?.[0] as { id: string; org_id: string } | undefined;

    if (!task) {
      console.log(
        "⚠️ No cleaning_tasks for this org – skipping cleaning_task_runs insert tests."
      );
    } else {
      const task_id = task.id;
      const run_on = new Date(Date.now() + 24 * 3600 * 1000)
        .toISOString()
        .slice(0, 10); // tomorrow – try to avoid unique conflicts
      const done_by = "TT";

      // insert that SHOULD be allowed
      {
        const { data, error } = await authed
          .from("cleaning_task_runs")
          .insert({
            org_id: ORG_ID,
            location_id,
            task_id,
            run_on,
            done_by,
          })
          .select("org_id, location_id, task_id, run_on, done_by");

        if (error) {
          console.error(
            "🚨 RLS/permissions? cleaning_task_runs insert FAILED for own org/location/task:",
            error.message
          );
        } else {
          console.log(
            "✅ cleaning_task_runs: insert for own org/location/task is allowed by RLS (or already existed).",
            data
          );
        }
      }

      // insert that SHOULD be blocked: forged org_id
      {
        const fakeOrgId = "00000000-0000-0000-0000-000000000000";

        const { data, error } = await authed
          .from("cleaning_task_runs")
          .insert({
            org_id: fakeOrgId,
            location_id,
            task_id,
            run_on,
            done_by: "XX",
          })
          .select("org_id, location_id, task_id, run_on, done_by");

        if (error) {
          console.log(
            "✅ cleaning_task_runs: forged-org insert blocked/errored as expected:",
            error.message
          );
        } else if ((data ?? []).length > 0) {
          console.error(
            "🚨 RLS FAIL: cleaning_task_runs insert with forged org_id succeeded:",
            data
          );
        } else {
          console.log(
            "✅ cleaning_task_runs: forged-org insert returned no rows (likely blocked by RLS)."
          );
        }
      }
    }
  }
}

async function main() {
  console.log("🔐 RLS smoke test starting…");

  await runTestsForUser("PRIMARY", PRIMARY);

  if (SECONDARY) {
    await runTestsForUser("SECONDARY", SECONDARY);
  }

  console.log("🔍 RLS smoke test finished.");
}

main().catch((err) => {
  console.error("Unhandled error in RLS test:", err);
  process.exit(1);
});
