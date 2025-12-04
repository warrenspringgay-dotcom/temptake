// src/lib/billing.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SubscriptionRow = {
  status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean | null;
};

// Read subscription status for an org and decide if access is valid
export async function getOrgSubscriptionStatus(orgId: string) {
  if (!orgId) {
    return { hasValid: false, row: null as SubscriptionRow | null };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("billing_subscriptions")
      .select("status, current_period_end, trial_ends_at, cancel_at_period_end")
      .eq("org_id", orgId)
      .maybeSingle<SubscriptionRow>();

    if (error) {
      console.error("[billing] getOrgSubscriptionStatus error", { orgId, error });
      return { hasValid: false, row: null };
    }

    if (!data) {
      console.log("[billing] getOrgSubscriptionStatus: no row for org", orgId);
      return { hasValid: false, row: null };
    }

    const nowIso = new Date().toISOString();
    const isFuture = (iso: string | null) => !!iso && iso > nowIso;

    let hasValid = false;

    // Normal active subscription
    if (data.status === "active") hasValid = true;

    // Any trial counts as valid access
    if (data.status === "trialing") hasValid = true;

    // Cancelled but still paid-up for current period
    if (data.cancel_at_period_end && isFuture(data.current_period_end)) {
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
    console.error("[billing] getOrgSubscriptionStatus unexpected error", err);
    return { hasValid: false, row: null };
  }
}

// Used by middleware
export async function orgHasValidSubscription(orgId: string) {
  const { hasValid } = await getOrgSubscriptionStatus(orgId);
  return hasValid;
}
