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
  active: boolean;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  hasValid: boolean;
};

const TRIAL_DAYS = 14;

export async function getSubscriptionForCurrentUser(): Promise<UserSubscriptionInfo> {
  const supabase = await getServerSupabase();

  // 1) Auth
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
      hasValid: false,
    };
  }

  // 2) Get org_id from profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr || !profile?.org_id) {
    console.error("[billing] no org_id on profile", profileErr);
    return {
      loggedIn: true,
      active: false,
      status: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      hasValid: false,
    };
  }

  const orgId = profile.org_id as string;

  // 3) Try to read existing subscription for this org
  let row: {
    status: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean | null;
    trial_ends_at: string | null;
  } | null = null;

  const { data: existing, error: subErr } = await supabase
    .from("billing_subscriptions")
    .select("status,current_period_end,cancel_at_period_end,trial_ends_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (subErr) {
    console.error("[billing] select billing_subscriptions error", subErr);
  } else if (existing && existing.length > 0) {
    row = existing[0] as any;
  }

  // 4) If nothing exists, auto-create a trial row
  if (!row) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

    const insertPayload = {
      org_id: orgId,
      user_id: user.id,
      stripe_subscription_id: null,
      status: "trialing",
      price_id: null,
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
      trial_ends_at: trialEnd.toISOString(),
    };

    const { data: inserted, error: insErr } = await supabase
      .from("billing_subscriptions")
      .insert(insertPayload)
      .select("status,current_period_end,cancel_at_period_end,trial_ends_at")
      .single();

    if (insErr) {
      console.error("[billing] insert billing_subscriptions error", insErr);
    } else if (inserted) {
      row = inserted as any;
    }
  }

  // 5) Still nothing? Treat as “no subscription”
  if (!row) {
    return {
      loggedIn: true,
      active: false,
      status: null,
      currentPeriodEnd: null,
      trialEndsAt: null,
      hasValid: false,
    };
  }

  const status = (row.status as SubscriptionStatus) ?? null;
  const currentPeriodEnd = row.current_period_end;
  const cancelAtPeriodEnd = !!row.cancel_at_period_end;
  const trialEndsAt = row.trial_ends_at;

  const now = new Date();
  const periodEndDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;

  const isWithinPeriod =
    periodEndDate == null ? true : periodEndDate.getTime() > now.getTime();

  const isActiveStatus =
    status === "active" || status === "trialing" || status === "past_due";

  const active = isActiveStatus && isWithinPeriod && !cancelAtPeriodEnd;

  return {
    loggedIn: true,
    active,
    status,
    currentPeriodEnd,
    trialEndsAt,
    hasValid: active,
  };
}
