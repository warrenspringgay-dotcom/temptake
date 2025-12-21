// src/lib/billing.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SubscriptionRow = {
  status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean | null;
};

export async function getOrgSubscriptionStatus(orgId: string) {
  if (!orgId) {
    return { hasValid: false, row: null as SubscriptionRow | null };
  }

  const { data, error } = await supabaseAdmin
    .from("billing_subscriptions")
    .select("status, current_period_end, trial_ends_at, cancel_at_period_end")
    .eq("org_id", orgId)
    .maybeSingle<SubscriptionRow>();

  if (error || !data) {
    return { hasValid: false, row: null };
  }

  const now = new Date().toISOString();
  const isFuture = (iso?: string | null) => !!iso && iso > now;

  const hasValid =
    data.status === "active" ||
    data.status === "trialing" ||
    (data.cancel_at_period_end && isFuture(data.current_period_end));

  return { hasValid, row: data };
}

export async function orgHasValidSubscription(orgId: string) {
  const { hasValid } = await getOrgSubscriptionStatus(orgId);
  return hasValid;
}
