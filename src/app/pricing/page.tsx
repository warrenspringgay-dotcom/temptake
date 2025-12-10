// src/app/pricing/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TempTake · Pricing",
  description:
    "Simple, per-site pricing for TempTake. No per-log nonsense, built for real UK kitchens.",
};

export default function PricingPage() {
  return (
    <div className="fixed inset-0 z-20 overflow-y-auto overflow-x-hidden bg-slate-950">
      <main className="min-h-screen bg-slate-950 text-slate-50">
        {/* Top bar – consistent with launch page */}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-4">
          <Link href="/launch" className="text-sm font-semibold text-slate-100">
            TempTake
            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
              Pricing
            </span>
          </Link>

          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/app"
              className="rounded-2xl border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              View demo dashboard
            </Link>
            <Link
              href="/launch#waitlist"
              className="rounded-2xl bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-sm hover:bg-emerald-600"
            >
              Join early access
            </Link>
          </div>
        </header>

        {/* Main pricing content */}
        <section className="border-t border-white/10 bg-slate-950/90">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="mb-8 max-w-3xl">
              <h1 className="text-3xl font-semibold sm:text-4xl">
                Simple pricing, built for real kitchens.
              </h1>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                No per-log charges, no per-device nonsense. One price per site,
                all the core modules included: temperatures, cleaning, allergens
                and basic training records.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Early access card */}
              <article className="relative flex flex-col rounded-2xl border border-emerald-500/40 bg-slate-950/80 p-5 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <div className="inline-flex w-fit items-center rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Founding kitchens
                </div>
                <h2 className="mt-3 text-lg font-semibold text-white">
                  Early access programme
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Limited number of sites working directly with us to shape the
                  product and workflows.
                </p>

                <div className="mt-4 text-3xl font-semibold text-emerald-300">
                  £0
                  <span className="text-sm font-normal text-slate-300">
                    {" "}
                    during beta
                  </span>
                </div>

                <ul className="mt-4 space-y-1.5 text-sm text-slate-200">
                  <li>• Full access to all TempTake features.</li>
                  <li>• Priority support and direct product input.</li>
                  <li>• Locked-in preferential launch pricing afterwards.</li>
                </ul>

                <div className="mt-5">
                  <button
                    type="button"
                    data-tally-open="obb4vX"
                    data-tally-layout="modal"
                    data-tally-emoji-text="👋"
                    data-tally-emoji-animation="wave"
                    data-tally-auto-close="0"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105"
                  >
                    Apply for early access
                  </button>
                </div>
              </article>

              {/* Future pricing card */}
              <article className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="inline-flex w-fit items-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Launch pricing
                </div>
                <h2 className="mt-3 text-lg font-semibold text-white">
                  Simple per-site pricing
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Exact numbers will move a little before launch, but the shape
                  won&apos;t: one clear price per site, no tricks.
                </p>

                <div className="mt-4 text-2xl font-semibold text-slate-200">
                  From £9.99/month
                  <span className="text-sm font-normal text-slate-400">
                    {" "}
                    per site
                  </span>
                </div>

                <ul className="mt-4 space-y-1.5 text-sm text-slate-200">
                  <li>• Unlimited logs, staff and devices.</li>
                  <li>• Temperatures, cleaning, allergens all included.</li>
                  <li>• Optional add-ons for larger groups only.</li>
                </ul>

                <p className="mt-4 text-[11px] text-slate-500">
                  We&apos;ll confirm final pricing with all early access
                  kitchens before launch. No surprise jumps. No dark patterns.
                </p>
              </article>
            </div>

            {/* Who it's for / FAQ */}
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-200">
                <h3 className="text-base font-semibold text-slate-50">
                  Who TempTake is for
                </h3>
                <ul className="mt-3 space-y-1.5 text-xs sm:text-sm">
                  <li>• Independent restaurants, pubs, bistros and cafés.</li>
                  <li>• Takeaways and dark kitchens that need clean records.</li>
                  <li>• Small groups that want consistent checks across sites.</li>
                  <li>
                    • Anyone sick of folders full of half-completed paper logs.
                  </li>
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-200">
                <h3 className="text-base font-semibold text-slate-50">
                  Common questions
                </h3>
                <dl className="mt-3 space-y-3 text-xs sm:text-sm">
                  <div>
                    <dt className="font-medium text-slate-100">
                      Do you charge per user or device?
                    </dt>
                    <dd className="text-slate-300">
                      No. Use as many phones, tablets and logins as you need on
                      each site.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-100">
                      Is there a contract?
                    </dt>
                    <dd className="text-slate-300">
                      Standard plans will be rolling monthly. Groups can have
                      annual terms if they want better rates.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-100">
                      Can I export my records?
                    </dt>
                    <dd className="text-slate-300">
                      Yes. Temperatures, cleaning and allergen checks can all be
                      exported for EHOs, head office or your own backup.
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            {/* CTA back to launch / waitlist */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-100">
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  Ready when you are.
                </p>
                <p className="text-[11px] text-emerald-200/80">
                  Join the early access list and we&apos;ll contact you as soon
                  as TempTake is ready for your kitchen.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/launch#waitlist"
                  className="rounded-2xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-emerald-600"
                >
                  Join early access
                </Link>
                <Link
                  href="/app"
                  className="rounded-2xl border border-emerald-400/50 bg-transparent px-4 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
                >
                  View demo dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
