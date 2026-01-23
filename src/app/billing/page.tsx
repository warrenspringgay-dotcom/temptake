// src/app/billing/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getPlanForLocationCount } from "@/lib/billingTiers";
import TrialBanner from "@/components/TrialBanner"
      


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

  // ✅ IMPORTANT: subscriptions are org-scoped (webhook writes org_id)
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

  const hasActiveSub =
    status === "active" || status === "trialing" || status === "past_due";

  const trialEndsAt = (subscription?.trial_ends_at as string | null) ?? null;

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">TempTake subscription</h1>
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
          Locations in this organisation: <strong>{locationCount}</strong>. This
          band covers{" "}
          {plan.maxLocations
            ? `up to ${plan.maxLocations} location${plan.maxLocations > 1 ? "s" : ""}.`
            : "6+ locations on a custom package."}
        </div>
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

       <form
  method="POST"
  action={`/api/stripe/create-portal-session?returnUrl=${encodeURIComponent(
    "https://temptake.com/billing"
  )}`}
>
  <button
    type="submit"
    className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
    disabled={!hasActiveSub}
  >
    Open billing portal
  </button>
</form>


          {plan.tier === "custom" && (
            <p className="mt-2 text-xs text-slate-500">
              For 6 or more sites we&apos;ll set up a custom package and
              onboarding call so everything is wired correctly from day one.
              Drop us a line at <strong>info@temptake.com</strong>.
            </p>
          )}
          
      <TrialBanner />
        </div>

        {/* Right: multi-site explanation */}
        <div className="flex flex-col rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Multi-site pricing
          </div>

          <h3 className="mt-3 text-lg font-semibold text-slate-900">
            Built for groups
          </h3>

          <ul className="mt-3 space-y-1.5 text-sm text-slate-800">
            <li>1. Open the Stripe billing portal from the button below.</li>
            <li>2. Upgrade to a band that covers the number of sites you need.</li>
            <li>
              3. Come back to TempTake – the <strong>Add location</strong> button
              will unlock and you can add your extra sites.
            </li>
          </ul>
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
