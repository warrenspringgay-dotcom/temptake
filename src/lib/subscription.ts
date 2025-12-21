// src/lib/subscription.ts
import { getServerSupabase } from "@/lib/supabaseServer";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "unknown"
  | null;

export type UserSubscriptionInfo = {
  loggedIn: boolean;
  active: boolean; // true if org currently has an active (or trialing) sub
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
};

export async function getSubscriptionForCurrentUser(): Promise<UserSubscriptionInfo> {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      loggedIn: false,
      active: false,
      status: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
    };
  }

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select(
      "status, current_period_end, cancel_at_period_end, trial_ends_at, stripe_subscription_id"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return {
      loggedIn: true,
      active: false,
      status: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
    };
  }

  const row = data[0];
  const status = (row.status as SubscriptionStatus) ?? null;
  const currentPeriodEnd = row.current_period_end as string | null;
  const trialEndsAt = row.trial_ends_at as string | null;
  const cancelAtPeriodEnd = !!row.cancel_at_period_end;
  const hasStripeSub = !!row.stripe_subscription_id;

  const now = new Date();
  let active = false;

  if (!hasStripeSub) {
    // Cardless trial mode: org has no Stripe sub yet, so rely solely on trial_ends_at
    if (status === "trialing" && trialEndsAt) {
      const trialEndDate = new Date(trialEndsAt);
      active = trialEndDate.getTime() > now.getTime();
    }
  } else {
    // Normal Stripe subscription logic
    const periodEndDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;

    const isWithinPeriod =
      periodEndDate == null ? true : periodEndDate.getTime() > now.getTime();

    const isActiveStatus =
      status === "active" || status === "trialing" || status === "past_due";

    active = isActiveStatus && isWithinPeriod && !cancelAtPeriodEnd;
  }

  return {
    loggedIn: true,
    active,
    status,
    currentPeriodEnd,
    trialEndsAt,
  };
}
