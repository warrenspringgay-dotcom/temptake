// src/app/billing/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import BillingActions from "@/components/BillingActions";

export default async function BillingPage() {
  const supabase = await getServerSupabaseAction();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=/billing`);
  }

  // Get org_id for this user
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  const orgId = profile?.org_id as string | undefined;

  // How many locations in this org?
  let locationCount = 0;
  if (orgId) {
    const { count } = await supabase
      .from("locations")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);

    locationCount = count ?? 0;
  }

  // Work out which pricing band they *fall into* based on locations
  function getPlanTier(count: number) {
    if (count <= 1) {
      return {
        key: "single",
        label: "Single site (£9.99 / month)",
        maxLocations: 1,
      };
    }
    if (count <= 3) {
      return {
        key: "up_to_3",
        label: "Up to 3 sites (£19.99 / month)",
        maxLocations: 3,
      };
    }
    if (count <= 5) {
      return {
        key: "up_to_5",
        label: "Up to 5 sites (£29.99 / month)",
        maxLocations: 5,
      };
    }
    return {
      key: "custom",
      label: "6+ sites – custom pricing",
      maxLocations: Infinity,
    };
  }

  const tier = getPlanTier(locationCount);

  // Org-level subscription row (latest)
  let status: string | null = null;

  if (orgId) {
    const { data: subRow, error: subError } = await supabase
      .from("billing_subscriptions")
      .select("status, trial_ends_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("[billing page] billing_subscriptions error:", subError);
    }

    status = (subRow?.status as string | null) ?? null;
  }

  const hasActiveSub =
    status === "active" || status === "trialing" || status === "past_due";

  const subscriptionStatusLabel = hasActiveSub
    ? status === "trialing"
      ? "Free trial active"
      : "Active"
    : "No subscription";

  const planPrefix = hasActiveSub
    ? "Current plan:"
    : "Plan tier (not active yet):";

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">TempTake subscription</h1>
      <p className="text-sm text-slate-600 mb-6">
        Choose a plan for your kitchen. You can switch or cancel any time in the
        Stripe billing portal.
      </p>

      {/* High-level status + plan description */}
      <div className="mb-6 space-y-1 text-sm">
        <p>
          <span className="font-semibold">Subscription status:</span>{" "}
          {subscriptionStatusLabel}
        </p>
        <p>
          <span className="font-semibold">{planPrefix}</span>{" "}
          {tier.label}
        </p>
        <p className="text-xs text-slate-500">
          Locations in this organisation: {locationCount} — this band covers up
          to{" "}
          {tier.maxLocations === Infinity
            ? "unlimited"
            : `${tier.maxLocations}`}{" "}
          location{tier.maxLocations === 1 ? "" : "s"}.
        </p>
      </div>

      {/* Existing component for the pricing cards + CTA buttons */}
      <BillingActions hasActiveSub={hasActiveSub} status={status} />
    </main>
  );
}
