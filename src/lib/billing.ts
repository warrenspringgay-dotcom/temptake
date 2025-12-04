// src/lib/billing.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SubscriptionRow = {
  status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean | null;
};

/**
 * Load the subscription row for an org and compute whether it has *any*
 * valid access (active, trial still in date, or cancelled but paid-up
 * until the end of the current period).
 *
 * If there is no row, or any error, this returns hasValid = false.
 */
export async function getOrgSubscriptionStatus(orgId: string) {
  if (!orgId) {
    return {
      hasValid: false,
      row: null as SubscriptionRow | null,
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select(
        "status, current_period_end, trial_ends_at, cancel_at_period_end"
      )
      .eq("org_id", orgId)
      .maybeSingle<SubscriptionRow>();

    if (error) {
      console.error("[billing] getOrgSubscriptionStatus error", {
        orgId,
        error,
      });
      return { hasValid: false, row: null };
    }

    if (!data) {
      console.log(
        "[billing] getOrgSubscriptionStatus: no row for org",
        orgId
      );
      return { hasValid: false, row: null };
    }

    const nowIso = new Date().toISOString();
    const isFuture = (iso: string | null) => !!iso && iso > nowIso;

    let hasValid = false;

    // 1) Normal active subscription
    if (data.status === "active") {
      hasValid = true;
    }

    // 2) Trial still in date
    if (data.status === "trialing" && isFuture(data.trial_ends_at)) {
      hasValid = true;
    }

    // 3) Cancelled but still paid-up until end of current period
    if (
      data.cancel_at_period_end &&
      isFuture(data.current_period_end)
    ) {
      hasValid = true;
    }

    if (!hasValid) {
      console.log("[billing] org has NO valid subscription", {
        orgId,
        status: data.status,
        current_period_end: data.current_period_end,
        trial_ends_at: data.trial_ends_at,
        cancel_at_period_end: data.cancel_at_period_end,
      });
    }

    return { hasValid, row: data };
  } catch (err) {
    console.error(
      "[billing] getOrgSubscriptionStatus unexpected error",
      err
    );
    return { hasValid: false, row: null };
  }
}

/**
 * Simple helper used by middleware.
 * Returns true ONLY if the org has a valid sub/trial.
 */
export async function orgHasValidSubscription(orgId: string) {
  const { hasValid } = await getOrgSubscriptionStatus(orgId);
  return hasValid;
}
