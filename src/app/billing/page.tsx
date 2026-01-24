// src/app/billing/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getBandForLocationCount, PLAN_BANDS } from "@/lib/billingTiers";
import TrialBanner from "@/components/TrialBanner";

export const dynamic = "force-dynamic";

function fmtDDMMYYYY(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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

  // Get org_id
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) console.error("[billing/page] profile lookup error", profileErr);

  const orgId = profile?.org_id as string | undefined;

  // Count locations
  let locationCount = 0;
  if (orgId) {
    const { count, error: locErr } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);

    if (locErr) console.error("[billing/page] locations count error", locErr);
    locationCount = count ?? 0;
  }

  const recommended = getBandForLocationCount(locationCount || 1);

  // Latest subscription row (org-scoped)
  const { data: subRows, error: subErr } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("org_id", orgId ?? "__no_org__")
    .order("created_at", { ascending: false })
    .limit(1);

  if (subErr) console.error("[billing/page] subscription lookup error", subErr);

  const subscription = subRows?.[0] ?? null;
  const status = (subscription?.status as string | null) ?? null;

  const hasActiveSub = status === "active" || status === "trialing" || status === "past_due";
  const trialEndsAt = (subscription?.trial_ends_at as string | null) ?? null;

  // Stripe customer (org-scoped). If this is missing, portal will look “empty”.
  const { data: custRows } = await supabase
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("org_id", orgId ?? "__no_org__")
    .limit(1);

  const stripeCustomerId = (custRows?.[0] as any)?.stripe_customer_id as string | undefined;
  const hasStripePortalContext = !!stripeCustomerId || !!subscription?.stripe_subscription_id;

  const planSingle = PLAN_BANDS.find((p) => p.id === "single")!;
  const planUpTo3 = PLAN_BANDS.find((p) => p.id === "up_to_3")!;
  const planUpTo5 = PLAN_BANDS.find((p) => p.id === "up_to_5")!;

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
          {hasActiveSub ? (
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
            Free trial ends on <strong>{fmtDDMMYYYY(trialEndsAt)}</strong>.
          </div>
        )}

        <div className="mt-2 text-xs text-slate-600">
          Locations in this organisation: <strong>{locationCount}</strong>. Recommended plan:{" "}
          <strong>{recommended.label}</strong>.
        </div>

        {status === "trialing" && !hasStripePortalContext && (
          <div className="mt-2 text-xs text-slate-600">
            You’re currently on a free trial. The Stripe billing portal will show your plan once you start a
            subscription.
          </div>
        )}
      </div>

      {/* Pricing + multi-site explanation */}
      <section className="grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)]">
        {/* Left: main purchase card */}
        <div className="rounded-2xl border bg-white px-5 py-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">MONTHLY</h2>

          <p className="mt-2 text-sm text-slate-700">
            Pick the plan that covers the number of locations you want on your account:
          </p>

          <div className="mt-4 space-y-3">
            {/* Single monthly */}
            <form method="POST" action="/api/stripe/create-checkout-session?band=single&interval=month">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                disabled={hasActiveSub}
              >
                <span>
                  <span className="font-semibold">{planSingle.label}</span>
                  <span className="block text-xs text-slate-600">£{planSingle.pricePerMonth} / month</span>
                </span>
                <span className="text-slate-500">Select</span>
              </button>
            </form>

            {/* Up to 3 */}
            <form method="POST" action="/api/stripe/create-checkout-session?band=up_to_3&interval=month">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                disabled={hasActiveSub}
              >
                <span>
                  <span className="font-semibold">{planUpTo3.label}</span>
                  <span className="block text-xs text-slate-600">£{planUpTo3.pricePerMonth} / month</span>
                </span>
                <span className="text-slate-500">Select</span>
              </button>
            </form>

            {/* Up to 5 */}
            <form method="POST" action="/api/stripe/create-checkout-session?band=up_to_5&interval=month">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                disabled={hasActiveSub}
              >
                <span>
                  <span className="font-semibold">{planUpTo5.label}</span>
                  <span className="block text-xs text-slate-600">£{planUpTo5.pricePerMonth} / month</span>
                </span>
                <span className="text-slate-500">Select</span>
              </button>
            </form>

            {/* Single annual */}
            <form method="POST" action="/api/stripe/create-checkout-session?band=single&interval=year">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                disabled={hasActiveSub}
              >
                <span>
                  <span className="font-semibold">Single site (annual)</span>
                  <span className="block text-xs text-slate-600">Billed yearly</span>
                </span>
                <span className="text-slate-500">Select</span>
              </button>
            </form>

            {/* Custom */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-800">
              <div className="font-semibold">6+ locations (custom)</div>
              <div className="mt-1 text-xs text-slate-600">
                Email{" "}
                <a className="text-emerald-700 underline" href="mailto:info@temptake.com">
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
              3. Come back to TempTake. The <strong>Add location</strong> button stays locked until your plan
              covers it.
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

        <form method="POST" action="/api/stripe/create-portal-session">
          <button
            type="submit"
            className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            disabled={!hasStripePortalContext}
            title={!hasStripePortalContext ? "No Stripe subscription yet" : undefined}
          >
            Open billing portal
          </button>
        </form>
      </section>
    </main>
  );
}
