// src/app/pricing/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

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
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" width={44} height={44} alt="TempTake" />
              <span className="font-semibold">TempTake</span>
            </Link>
          </div>

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
            <div className="mb-8 max-w-3xl">
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

            {/* Early access + monthly bands */}
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
                  Limited number of sites working directly with us to shape the product
                  and workflows.
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

              {/* Monthly banded pricing card */}
              <article className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <div className="inline-flex w-fit items-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Monthly
                </div>
                <h2 className="mt-3 text-lg font-semibold text-white">
                  £9.99 / month (from)
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Pricing is banded by the number of locations on your account:
                </p>

                <div className="mt-4 space-y-2 text-sm text-slate-100">
                  <div className="flex items-baseline justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                    <span className="text-slate-300">1 site</span>
                    <span className="text-sm font-semibold text-slate-50">
                      £9.99 / month
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                    <span className="text-slate-300">2–3 sites</span>
                    <span className="text-sm font-semibold text-slate-50">
                      £19.99 / month
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
                    <span className="text-slate-300">4–5 sites</span>
                    <span className="text-sm font-semibold text-slate-50">
                      £29.99 / month
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                    <span className="text-slate-100">6+ sites</span>
                    <span className="text-sm font-semibold text-emerald-200">
                      Custom pricing · contact us
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-slate-400">
                  All bands include unlimited staff logins, unlimited devices and access
                  to temperatures, cleaning, allergens and basic training records.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <Link
                    href="/launch#waitlist"
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm hover:bg-emerald-600"
                  >
                    Join early access
                  </Link>
                  <Link
                    href="/app"
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
                <Link
                  href="/launch#waitlist"
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm hover:bg-emerald-600"
                >
                  Talk to us about 6+ sites
                </Link>
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

            {/* CTA back to launch / waitlist */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-100">
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  Ready when you are.
                </p>
                <p className="text-[11px] text-emerald-200/80">
                  Join the early access list and we&apos;ll contact you as soon as
                  TempTake is ready for your kitchen.
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
