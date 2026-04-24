// src/app/pricing/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";

export const metadata: Metadata = {
  title: "TempTake · Pricing",
  description:
    "Simple, banded per-site pricing for TempTake. No per-log nonsense, built for real UK kitchens.",
};

export default function PricingPage() {
  return (
    <div className="fixed inset-0 z-20 overflow-y-auto overflow-x-hidden bg-slate-950">
      <main className="min-h-screen bg-slate-950 text-slate-50">
        {/* Top bar – mirror launch page (logo + login) */}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Link href="/launch" className="flex items-center gap-2">
              <Image src="/logo.png" width={44} height={44} alt="TempTake" />
              <span className="font-semibold">TempTake</span>
            </Link>
          </div>

          <Script src="https://tally.so/widgets/embed.js" async />

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10"
          >
            Log in
          </Link>
        </header>

        {/* Main pricing content */}
        <section className="border-t border-white/10 bg-slate-950/90">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            {/* Hero copy */}
            <div className="mb-8 max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Pricing · Monthly plans
              </div>
              <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Simple pricing, built for real kitchens.
              </h1>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                No per-log charges, no per-device nonsense. One monthly price based on
                how many locations you run in TempTake. All core modules included:
                temperatures, cleaning, allergens and basic training records.
              </p>
            </div>

            {/* Free trial + monthly bands */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Free trial card */}
              <article className="relative flex flex-col rounded-2xl border border-emerald-500/40 bg-slate-950/80 p-5 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <div className="inline-flex w-fit items-center rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Free trial
                </div>
                <h2 className="mt-3 text-xl font-semibold text-white">
                  Start using TempTake
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Get started and see how TempTake works in your kitchen before moving onto
                  a monthly plan.
                </p>

                <div className="mt-5">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Get started for
                  </div>
                  <div className="mt-1 text-5xl font-semibold leading-none text-emerald-300 sm:text-6xl">
                    £0
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    Full access to test the workflow before you commit.
                  </div>
                </div>

                <ul className="mt-6 space-y-2 text-sm text-slate-200">
                  <li>• Full access to the core TempTake workflow.</li>
                  <li>• See how it fits your kitchen before committing.</li>
                  <li>• Move onto a paid monthly plan when ready.</li>
                </ul>

                <Link
                  href="/"
                  className="absolute right-0 top-0 rounded-full bg-black/50 px-3 py-1 text-xs text-slate-50 shadow-sm backdrop-blur hover:bg-black/70"
                >
                  ✕ Back
                </Link>

                <div className="mt-6">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
                  >
                    Start free trial
                  </Link>
                </div>
              </article>

              {/* Monthly banded pricing card */}
              <article className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <div className="inline-flex w-fit items-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Monthly
                </div>

                <div className="mt-4">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Paid plans start from
                  </div>
                  <div className="mt-2 text-5xl font-semibold leading-none text-white sm:text-6xl">
                    £9.99
                  </div>
                  <div className="mt-2 text-lg font-medium text-emerald-300">
                    per month
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-300">
                  Pricing is banded by the number of locations on your account:
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">1 site</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        Best value starting point
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-semibold leading-none text-emerald-300">
                        £9.99
                      </div>
                      <div className="mt-1 text-xs text-slate-300">/ month</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">2–3 sites</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Growing operators
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold leading-none text-slate-50">
                        £19.99
                      </div>
                      <div className="mt-1 text-xs text-slate-300">/ month</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-200">4–5 sites</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Multi-site groups
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold leading-none text-slate-50">
                        £29.99
                      </div>
                      <div className="mt-1 text-xs text-slate-300">/ month</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-100">6+ sites</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200/80">
                        Groups & enterprise
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold leading-none text-emerald-200">
                        Custom pricing
                      </div>
                      <a
                        href="mailto:info@temptake.com?subject=Enterprise%20pricing%20enquiry"
                        className="mt-1 inline-block text-xs text-slate-300 underline underline-offset-2 hover:text-emerald-200"
                      >
                        Contact us
                      </a>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-slate-400">
                  All bands include unlimited staff logins, unlimited devices and access
                  to temperatures, cleaning, allergens and basic training records.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
                  >
                    Start free trial
                  </Link>
                  <Link
                    href="/demo"
                    className="rounded-2xl border border-slate-600 bg-transparent px-4 py-2 text-xs font-medium text-slate-100 hover:bg-slate-900"
                  >
                    View demo dashboard
                  </Link>
                </div>
              </article>
            </div>

            {/* Enterprise / custom emphasis for 6+ */}
            <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-100 md:flex md:items-center md:justify-between md:gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  6+ sites, groups &amp; enterprise
                </p>
                <p className="text-xs text-slate-300">
                  If you&apos;re running six or more kitchens, we&apos;ll set up a custom
                  per-site rate and group reporting that actually fits your operation.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0">
                <span className="rounded-full border border-slate-600 px-3 py-1 text-[11px] text-slate-200">
                  Custom per-site pricing
                </span>
                <button
                  type="button"
                  data-tally-open="obb4vX"
                  data-tally-layout="modal"
                  data-tally-emoji-text="👋"
                  data-tally-emoji-animation="wave"
                  data-tally-auto-close="0"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
                >
                  Book a walkthrough
                </button>
              </div>
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
                    • Operators done with folders full of half-completed paper logs.
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
                      No. Use as many phones, tablets and logins as you need on each
                      site.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-100">
                      Is there a contract?
                    </dt>
                    <dd className="text-slate-300">
                      Standard plans will be rolling monthly. Groups can have annual
                      terms if they want better rates.
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

            {/* CTA */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-100">
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  Ready when you are.
                </p>
                <p className="text-[11px] text-emerald-200/80">
                  Start your free trial now, or book a walkthrough if you want to see
                  how TempTake fits your kitchen first.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
                >
                  Start free trial
                </Link>
                <Link
                  href="/demo"
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