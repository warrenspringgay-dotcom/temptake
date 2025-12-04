// src/app/billing/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabaseAction } from "@/lib/supabaseServer";
import BillingActions from "@/components/BillingActions";
import { getOrgSubscriptionStatus } from "@/lib/billing";

export default async function BillingPage() {
  const supabase = await getServerSupabaseAction();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=/billing`);
  }

  // Grab org_id for this user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id) {
    // No org attached yet – show friendly message + no active sub
    return (
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2">TempTake subscription</h1>
        <p className="text-sm text-slate-600 mb-4">
          No kitchen/organisation is linked to this account yet. Please finish
          setup first.
        </p>

        <BillingActions hasActiveSub={false} status={null} />
      </main>
    );
  }

  const orgId = profile.org_id as string;

  // Ask billing helper for the org’s subscription row + validity
  const { hasValid, row } = await getOrgSubscriptionStatus(orgId);

  const status = (row?.status as string | null) ?? null;

  // Build a nice label for the UI
  let statusLabel = "No subscription";

  if (row) {
    if (row.status === "trialing") {
      statusLabel = "Free trial active";
    } else if (row.status === "active") {
      statusLabel = "Active subscription";
    } else if (row.cancel_at_period_end && row.current_period_end) {
      const endDate = new Date(row.current_period_end);
      statusLabel = `Cancels on ${endDate.toLocaleDateString("en-GB")}`;
    } else {
      statusLabel = "Inactive subscription";
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">TempTake subscription</h1>
      <p className="text-sm text-slate-600 mb-2">
        Choose a plan for your kitchen. You can switch or cancel any time in the
        Stripe billing portal.
      </p>

      <p className="text-sm text-slate-700 mb-6">
        Subscription status:{" "}
        <span className="font-medium">{statusLabel}</span>
      </p>

      {/* You can also show trial end date if you like */}
      {row?.status === "trialing" && row.trial_ends_at && (
        <p className="text-xs text-amber-700 mb-4">
          Free trial ends on{" "}
          {new Date(row.trial_ends_at).toLocaleDateString("en-GB")}.
        </p>
      )}

      <BillingActions hasActiveSub={hasValid} status={status} />
    </main>
  );
}
