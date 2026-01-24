// src/app/billing/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";
import {
  getPlanForLocationCount,
  PLAN_BANDS,
  type PlanBandId,
} from "@/lib/billingTiers";
import TrialBanner from "@/components/TrialBanner";

export const dynamic = "force-dynamic";

function fmtDDMMYYYYFromIso(iso: string) {
  // DD/MM/YYYY (UK)
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB");
}

function bandLabel(id: PlanBandId) {
  const b = PLAN_BANDS.find((x) => x.id === id);
  return b?.label ?? id;
}

export default async function BillingPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=/billing`);
  }

  // Get org_id for this user
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) console.error("[billing/page] profile lookup error", profileErr);

  const orgId = profile?.org_id as string | undefined;

  // Count locations for the org
  let locationCount = 0;
  if (orgId) {
    const { count, error: locErr } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (locErr) console.error("[billing/page] locations count error", locErr);
    locationCount = count ?? 0;
  }

  const recommendedPlan = getPlanForLocationCount(locationCount || 1);

  // Org-scoped subscription row (what your webhook writes)
  const { data: subRows, error: subErr } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("org_id", orgId ?? "__no_org__")
    .order("created_at", { ascending: false })
    .limit(1);

  if (subErr) console.error("[billing/page] subscription lookup error", subErr);

  const subscription = subRows?.[0] ?? null;
  const status = (subscription?.status as string | null) ?? null;

  const trialEndsAt = (subscription?.trial_ends_at as string | null) ?? null;

  // IMPORTANT:
  // - "hasValid" is for your app gating
  // - "hasStripeSub" is for Stripe portal access
  const hasValid =
    status === "active" || status === "trialing" || status === "past_due";

  const stripeSubscriptionId =
    (subscription?.stripe_subscription_id as string | null) ?? null;

  const hasStripeSub = !!stripeSubscriptionId;

  // helper to build a form action URL
  const checkoutAction = (band: PlanBandId, interval: "month" | "year") =>
    `/api/stripe/create-checkout-session?band=${encodeURIComponent(
      band
    )}&interval=${encodeURIComponent(interval)}`;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">TempTake subscription</h1>
        <p className="text-sm text-slate-600">
          Choose a plan for your kitchen. You can switch or cancel any time in
          the Stripe billing portal (once you actually have a Stripe subscription).
        </p>
      </div>

      {/* Overall status */}
      <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <div className="font-semibold">
          Subscription status:{" "}
          {hasValid ? (
            status === "trialing" ? (
              <span className="text-emerald-600">Free trial active</span>
            ) : (
              <span className="text-emerald-600">Active</span>
            )
          ) : (
            <span className="text-rose-600">No subscription</span>
          )}
        </div>

        {status === "trialing" && trialEndsAt && (
          <div className="mt-1 text-xs text-slate-600">
            Free trial ends on {fmtDDMMYYYYFromIso(trialEndsAt)}.
          </div>
        )}

        <div className="mt-2 text-xs text-slate-600">
          Locations in this organisation: <strong>{locationCount}</strong>.{" "}
          Recommended plan:{" "}
          <strong>{bandLabel(recommendedPlan.id as PlanBandId)}</strong>.
        </div>

        {!hasStripeSub && hasValid && (
          <div className="mt-2 text-xs text-slate-600">
            You’re currently on an app trial. The Stripe billing portal will show your
            plan once you start a Stripe subscription.
          </div>
        )}
      </div>

      {/* Pricing + multi-site explanation */}
      <section className="grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
        {/* Left: purchase card */}
        <div className="rounded-2xl border bg-white px-5 py-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">MONTHLY</h2>

          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-semibold text-slate-900">
              £{recommendedPlan.pricePerMonth ?? 9.99}
            </div>
            <span className="text-sm text-slate-500">/ month (from)</span>
          </div>

          <p className="mt-3 text-sm text-slate-700">
            Pick the plan that covers the number of locations you want on your account:
          </p>

          <div className="mt-3 space-y-2">
            {/* Single site */}
            <form method="POST" action={checkoutAction("single", "month")}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                disabled={hasStripeSub && status === "active"}
              >
                <span>
                  <div className="font-semibold text-slate-900">Single site (1 location)</div>
                  <div className="text-xs text-slate-600">£9.99 / month</div>
                </span>
                <span className="text-xs text-slate-500">Select</span>
              </button>
            </form>

            {/* Up to 3 */}
            <form method="POST" action={checkoutAction("up_to_3", "month")}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                disabled={false}
              >
                <span>
                  <div className="font-semibold text-slate-900">TempTake Plus (up to 3 sites)</div>
                  <div className="text-xs text-slate-600">£19.99 / month</div>
                </span>
                <span className="text-xs text-slate-500">Select</span>
              </button>
            </form>

            {/* Up to 5 */}
            <form method="POST" action={checkoutAction("up_to_5", "month")}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                disabled={false}
              >
                <span>
                  <div className="font-semibold text-slate-900">Pro (up to 5 sites)</div>
                  <div className="text-xs text-slate-600">£29.99 / month</div>
                </span>
                <span className="text-xs text-slate-500">Select</span>
              </button>
            </form>

            {/* Annual single-site */}
            <form method="POST" action={checkoutAction("single", "year")}>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <span>
                  <div className="font-semibold text-slate-900">Single site (annual)</div>
                  <div className="text-xs text-slate-600">Billed yearly</div>
                </span>
                <span className="text-xs text-slate-500">Select</span>
              </button>
            </form>

            {/* Custom */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
              <div className="font-semibold text-slate-900">6+ locations (custom)</div>
              <div className="text-xs text-slate-700">
                Email{" "}
                <a
                  href="mailto:info@temptake.com"
                  className="text-emerald-700 underline hover:text-emerald-500"
                >
                  info@temptake.com
                </a>{" "}
                and we’ll sort it.
              </div>
            </div>
          </div>

          <TrialBanner />
        </div>

        {/* Right: multi-site explanation */}
        <div className="flex flex-col rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Multi-site pricing
          </div>

          <h3 className="mt-3 text-lg font-semibold text-slate-900">Built for groups</h3>

          <ul className="mt-3 space-y-1.5 text-sm text-slate-800">
            <li>1. Choose the plan that covers the number of sites you need.</li>
            <li>2. Complete checkout in Stripe.</li>
            <li>
              3. Come back to TempTake – the <strong>Add location</strong> button stays locked
              until your plan covers it.
            </li>
          </ul>
        </div>
      </section>

      {/* Billing portal */}
      <section className="rounded-2xl border bg-white px-5 py-5">
        <h2 className="text-sm font-semibold text-slate-800">Manage your subscription</h2>
        <p className="mt-1 text-xs text-slate-600">
          Update payment method, view invoices or cancel via the Stripe billing portal.
        </p>

        {hasStripeSub ? (
          <form method="POST" action="/api/stripe/create-portal-session">
            <button
              type="submit"
              className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Open billing portal
            </button>
          </form>
        ) : (
          <div className="mt-3 rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-700">
            No Stripe subscription yet, so there’s no billing portal to manage.
            If you want to pay now (even during the free trial), select a plan above to start
            your Stripe subscription.
          </div>
        )}
      </section>
    </main>
  );
}
