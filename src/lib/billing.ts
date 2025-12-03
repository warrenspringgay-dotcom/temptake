// src/lib/billing.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey);

const ACTIVE_STATUSES = ["trialing", "active", "past_due"];

export async function orgHasValidSubscription(orgId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("billing_subscriptions")
    .select("status, current_period_end, cancel_at_period_end")
    .eq("org_id", orgId)
    .limit(1);

  if (error) {
    console.error("[billing] orgHasValidSubscription error", error);
    return false;
  }

  const sub = data?.[0];
  if (!sub) return false;

  if (!ACTIVE_STATUSES.includes(sub.status)) return false;

  if (sub.current_period_end) {
    const now = new Date();
    const end = new Date(sub.current_period_end);
    if (end < now) return false;
  }

  // If they cancelled but still in paid period, you can choose:
  if (sub.cancel_at_period_end) {
    // still allow until current_period_end
    return true;
  }

  return true;
}
