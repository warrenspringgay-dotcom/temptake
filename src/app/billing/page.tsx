// src/app/billing/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getPlanForLocationCount } from "@/lib/billingTiers";
import TrialBanner from "@/components/TrialBanner";

export const dynamic = "force-dynamic";

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

  if (profileErr) {
    console.error("[billing/page] profile lookup error", profileErr);
  }

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

  const plan = getPlanForLocationCount(locationCount || 1);

  // Subscriptions are org-scoped (webhook writes org_id)
  const { data: subRows, error: subErr } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("org_id", orgId ?? "__no_org__")
    .order("created_at", { ascending: false })
    .limit(1);

  if (subErr) {
    console.error("[billing/page] subscription lookup error", subErr);
  }

  const subscription = subRows?.[0] ?? null;

  const status = (subscription?.status as string | null) ?? null;
  const stripeSubId = (subscription?.stripe_subscription_id as string | null) ?? null;

  // ✅ Only treat portal / Stripe as available if a Stripe subscription exists
  const hasStripeSubscription =
    !!stripeSubId && (status === "active" || status === "trialing" || status === "past_due");

  // ✅ App-only trial = trialing but no Stripe sub id
  const hasAppTrial = !stripeSubId && status === "trialing";

  // Any paid-ish status *in Stripe* counts as “subscription exists”
  const hasPaidOrStripeTrial = hasStripeSubscription;

  const trialEndsAt = (subscription?.trial_ends_at as string | null) ?? null;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">TempTake subscription</h1>
        <p className="text-sm text-slate-600">
          Choose a plan for your kitchen. You can switch or cancel any time in the Stripe billing portal
          (once you actually have a Stripe subscription).
        </p>
      </div>

      {/* Overall status */}
      <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <div className="font-semibold">
          Subscription status:{" "}
          {hasStripeSubscription ? (
            status === "trialing" ? (
              <span className="text-emerald-600">Free trial active</span>
            ) : (
              <span className="text-emerald-600">Active</span>
            )
          ) : hasAppTrial ? (
            <span className="text-emerald-600">Free trial active</span>
          ) : (
            <span className="text-rose-600">No subscription</span>
          )}
        </div>

        {(status === "trialing" && trialEndsAt) && (
          <div className="mt-1 text-xs text-slate-600">
            Free trial ends on {new Date(trialEndsAt).toLocaleDateString("en-GB")}.
          </div>
        )}

        <div className="mt-2 text-xs text-slate-600">
          Locations in this organisation: <strong>{locationCount}</strong>. This band covers{" "}
          {plan.maxLocations
            ? `up to ${plan.maxLocations} location${plan.maxLocations > 1 ? "s" : ""}.`
            : "6+ locations on a custom package."}
        </div>

        {/* Helpful nudge (only when app-only trial exists) */}
        {hasAppTrial && (
          <div className="mt-2 text-xs text-slate-600">
            You’re currently on a free trial. The Stripe billing portal will show your plan once you start a subscription.
          </div>
        )}
      </div>

      {/* Pricing + multi-site explanation */}
      <section className="grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
        {/* Left: main purchase card */}
        <div className="rounded-2xl border bg-white px-5 py-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">MONTHLY</h2>

          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-semibold text-slate-900">
              £{plan.pricePerMonth ?? 9.99}
            </div>
            <span className="text-sm text-slate-500">/ month (from)</span>
          </div>

          <p className="mt-3 text-sm text-slate-700">
            Pricing is banded by the number of locations on your account:
          </p>

          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>• 1 site → £9.99 / month</li>
            <li>• 2–3 sites → £19.99 / month</li>
            <li>• 4–5 sites → £29.99 / month</li>
            <li>
              • 6+ sites → custom pricing{" "}
              <a
                href="mailto:info@temptake.com"
                className="text-emerald-600 underline hover:text-emerald-400"
              >
                contact us
              </a>
            </li>
          </ul>

          {/* Start subscription */}
          <form method="POST" action="/api/stripe/create-checkout-session">
            <button
              type="submit"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300"
              disabled={plan.tier === "custom" || hasPaidOrStripeTrial}
            >
              {hasPaidOrStripeTrial ? "Subscription already active" : "Start monthly subscription"}
            </button>
          </form>

          {/* Stripe portal button (only if Stripe sub exists) */}
          <form method="POST" action="/api/stripe/create-portal-session">
            <button
              type="submit"
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              disabled={!hasStripeSubscription}
              title={!hasStripeSubscription ? "Available after you start a subscription" : undefined}
            >
              Open billing portal
            </button>
          </form>

          {plan.tier === "custom" && (
            <p className="mt-2 text-xs text-slate-500">
              For 6 or more sites we&apos;ll set up a custom package and onboarding call so everything is wired
              correctly from day one. Drop us a line at <strong>info@temptake.com</strong>.
            </p>
          )}

          <TrialBanner />
        </div>

        {/* Right: multi-site explanation */}
        <div className="flex flex-col rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Multi-site pricing
          </div>

          <h3 className="mt-3 text-lg font-semibold text-slate-900">Built for groups</h3>

          <ul className="mt-3 space-y-1.5 text-sm text-slate-800">
            <li>1. Start a subscription using the button on the left.</li>
            <li>2. Open the Stripe billing portal to upgrade to the correct band.</li>
            <li>
              3. Come back to TempTake – the <strong>Add location</strong> button will unlock and you can add your
              extra sites.
            </li>
          </ul>
        </div>
      </section>

      {/* Billing portal (same gating, kept as separate section to preserve your layout) */}
      <section className="rounded-2xl border bg-white px-5 py-5">
        <h2 className="text-sm font-semibold text-slate-800">Manage your subscription</h2>
        <p className="mt-1 text-xs text-slate-600">
          If you already have an active subscription, you can update your card, view invoices or cancel via the Stripe
          billing portal.
        </p>

        <form method="POST" action="/api/stripe/create-portal-session">
          <button
            type="submit"
            className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            disabled={!hasStripeSubscription}
            title={!hasStripeSubscription ? "Available after you start a subscription" : undefined}
          >
            Open billing portal
          </button>
        </form>
      </section>
    </main>
  );
}
