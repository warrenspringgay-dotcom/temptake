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

  // Get the most recent subscription for this user
  const { data: subRows, error: subError } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (subError) {
    console.error("[billing page] billing_subscriptions error:", subError);
  }

  const subscription = subRows?.[0] ?? null;

  const status = (subscription?.status as string | null) ?? null;
  const trialEndsAt = (subscription?.trial_ends_at as string | null) ?? null;
  const currentPeriodEnd =
    (subscription?.current_period_end as string | null) ?? null;

  const hasActiveSub =
    status === "active" || status === "trialing" || status === "past_due";

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">TempTake subscription</h1>
      <p className="text-sm text-slate-600 mb-8">
        Choose a plan for your kitchen. You can switch or cancel any time in the
        Stripe billing portal.
      </p>

      <BillingActions
        hasActiveSub={hasActiveSub}
        status={status}
        trialEndsAt={trialEndsAt}
        currentPeriodEnd={currentPeriodEnd}
      />
    </main>
  );
}
