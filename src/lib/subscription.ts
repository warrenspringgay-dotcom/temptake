// src/lib/subscription.ts
import { createServerClient } from "@/lib/supabaseServer";

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
  active: boolean; // true if user currently has an active (or trialing) sub
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
};

export async function getSubscriptionForCurrentUser(): Promise<UserSubscriptionInfo> {
  const supabase = await createServerClient();

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
    };
  }

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .eq("user_id", user.id)
    .order("current_period_end", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return {
      loggedIn: true,
      active: false,
      status: null,
      currentPeriodEnd: null,
    };
  }

  const row = data[0];
  const status = (row.status as SubscriptionStatus) ?? null;
  const currentPeriodEnd = row.current_period_end as string | null;
  const cancelAtPeriodEnd = !!row.cancel_at_period_end;

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
  };
}
