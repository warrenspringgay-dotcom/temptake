// src/app/billing/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getPlanForLocationCount } from "@/lib/billingTiers";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  // ✅ IMPORTANT: await the helper so supabase is NOT a Promise
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/login?next=/billing`);
  }

  // How many locations in this org?
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  const orgId = profile?.org_id as string | undefined;

  let locationCount = 0;
  if (orgId) {
    const { count } = await supabase
      .from("locations")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId);
    locationCount = count ?? 0;
  }

  const plan = getPlanForLocationCount(locationCount || 1);

  // Latest subscription row (if any)
  const { data: subRows } = await supabase
    .from("billing_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const subscription = subRows?.[0] ?? null;
  const status = (subscription?.status as string | null) ?? null;

  const hasActiveSub =
    status === "active" || status === "trialing" || status === "past_due";

  const trialEndsAt = subscription?.trial_ends_at as string | null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-2">TempTake subscription</h1>
        <p className="text-sm text-slate-600">
          Choose a plan for your kitchen. You can switch or cancel any time in
          the Stripe billing portal.
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
            Free trial ends on{" "}
            {new Date(trialEndsAt).toLocaleDateString("en-GB")}.
          </div>
        )}

        <div className="mt-2 text-xs text-slate-600">
          Locations in this organisation: <strong>{locationCount}</strong>.{" "}
          This band covers{" "}
          {plan.maxLocations
            ? `up to ${plan.maxLocations} location${
                plan.maxLocations > 1 ? "s" : ""
              }.`
            : "6+ locations on a custom package."}
        </div>
      </div>

      {/* Pricing + start button */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)] items-start">
        {/* Left: main purchase card */}
        <div className="rounded-2xl border bg-white px-5 py-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">
            MONTHLY
          </h2>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-semibold text-slate-900">
              £{plan.pricePerMonth ?? 9.99}
            </div>
            <span className="text-sm text-slate-500">/ month (from)</span>
          </div>

          <p className="mt-3 text-sm text-slate-700">
            Pricing scales automatically with your number of locations:
          </p>
          <ul className="mt-2 text-sm text-slate-600 space-y-1">
            <li>• 1 site → £9.99 / month</li>
            <li>• 2–3 sites → £19.99 / month</li>
            <li>• 4–5 sites → £29.99 / month</li>
            <li>• 6+ sites → custom pricing (contact us)</li>
          </ul>

          <form method="POST" action="/api/stripe/create-checkout-session">
            <button
              type="submit"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300"
              disabled={plan.tier === "custom" || hasActiveSub}
            >
              {hasActiveSub
                ? "Subscription already active"
                : "Start monthly subscription"}
            </button>
          </form>

          {plan.tier === "custom" && (
            <p className="mt-2 text-xs text-slate-500">
              For 6 or more sites we&apos;ll set up a custom package and
              onboarding call so everything is wired correctly from day one.
              Drop us a line at <strong>info@temptake.com</strong>.
            </p>
          )}
        </div>

        {/* Right: explanation card */}
        <div className="rounded-2xl border bg-amber-50 px-5 py-6">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Multi-site pricing
          </div>

          <h2 className="mt-3 text-base font-semibold text-slate-900">
            Built for groups
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Add locations inside TempTake and we&apos;ll automatically put you
            on the right band based on your number of sites.
          </p>

          <p className="mt-3 text-sm text-slate-700">
            You&apos;re currently in the{" "}
            <strong>{plan.label}</strong> band.
          </p>
        </div>
      </section>

      {/* Billing portal */}
      <section className="rounded-2xl border bg-white px-5 py-5">
        <h2 className="text-sm font-semibold text-slate-800">
          Manage your subscription
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          If you already have an active subscription, you can update your card,
          view invoices or cancel via the Stripe billing portal.
        </p>

        <form method="POST" action="/api/stripe/create-portal-session">
          <button
            type="submit"
            className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            disabled={!hasActiveSub}
          >
            Open billing portal
          </button>
        </form>
      </section>
    </main>
  );
}
