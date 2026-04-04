// src/app/launch/page.tsx
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import LaunchClient from "./launch/LauncgClient";

export const metadata: Metadata = {
  title: "Food Hygiene App for UK Kitchens | TempTake",
  description:
    "TempTake is a food hygiene app for UK kitchens. Log temperatures, cleaning, sign-offs, allergens and training in one place. Save time logging, stay inspection-ready, and generate reports fast.",
  alternates: {
    canonical: "https://temptake.com/",
  },
  openGraph: {
    title: "Food Hygiene App for UK Kitchens | TempTake",
    description:
      "TempTake is a food hygiene app for UK kitchens. Replace paper logs with faster daily records, remote manager visibility and inspection-ready reports.",
    url: "https://temptake.com/",
    siteName: "TempTake",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Hygiene App for UK Kitchens | TempTake",
    description:
      "TempTake is a food hygiene app for UK kitchens. Save time logging and stay ready for inspection.",
  },
};

const GUIDES = [
  {
    title: "Temperature logs (UK)",
    pill: "Temps",
    description:
      "Set up routines, log checks fast, and handle fails properly with a clean audit trail.",
    href: "/guides/food-hygiene-temperature-logs-uk",
  },
  {
    title: "Cleaning rota (UK)",
    pill: "Cleaning",
    description:
      "Create tasks, complete on mobile, and keep rota records ready for inspection.",
    href: "/guides/kitchen-cleaning-rota-uk",
  },
  {
    title: "Allergen matrix (UK)",
    pill: "Allergens",
    description:
      "Keep your allergen matrix current and prove you’ve got controls in place.",
    href: "/guides/allergen-matrix-uk",
  },
  {
    title: "Training expiry (UK)",
    pill: "Training",
    description:
      "Track staff training expiry dates and stop certificates quietly lapsing.",
    href: "/guides/food-hygiene-training-expiry-uk",
  },
  {
    title: "SFBB logs",
    pill: "SFBB",
    description:
      "How to align your daily records with Safer Food Better Business expectations.",
    href: "/guides/safer-food-better-business-logs",
  },
];

type Screen = {
  src: string;
  alt: string;
  title: string;
  description: string;
  orientation: "landscape" | "portrait";
};

const SCREENSHOTS: Screen[] = [
  {
    src: "/dashboard.jpg",
    alt: "TempTake food hygiene app dashboard screen",
    title: "Dashboard overview",
    description: "See alerts, completion, checks and site activity in one place.",
    orientation: "landscape",
  },
  {
    src: "/wall.jpg",
    alt: "TempTake food hygiene app dashboard wall screen",
    title: "Team visibility",
    description: "Keep site communication and task visibility front and centre.",
    orientation: "portrait",
  },
  {
    src: "/training.jpg",
    alt: "TempTake food hygiene app training records screen",
    title: "Training records",
    description: "Track certificates, progress and expiry in one place.",
    orientation: "portrait",
  },
  {
    src: "/temp_log.jpg",
    alt: "TempTake food hygiene app temperature logging screen",
    title: "Temperature logging",
    description: "Fast checks with clear pass and fail records.",
    orientation: "portrait",
  },
  {
    src: "/cleaning_rota.jpg",
    alt: "TempTake food hygiene app cleaning rota screen",
    title: "Cleaning rota",
    description: "Daily tasks kept visible and easy to complete.",
    orientation: "portrait",
  },
  {
    src: "/allergens.jpg",
    alt: "TempTake food hygiene app allergen matrix screen",
    title: "Allergen controls",
    description: "Keep allergen information clear and current.",
    orientation: "portrait",
  },
];

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function LaunchPage() {
  const tallyId = "obb4vX";

  const tallyAttrs = {
    "data-tally-open": tallyId,
    "data-tally-layout": "modal",
    "data-tally-emoji-text": "👋",
    "data-tally-emoji-animation": "wave",
    "data-tally-auto-close": "0",
  } as const;

  const heroPrimary = SCREENSHOTS[0];
  const heroSecondary = [SCREENSHOTS[3], SCREENSHOTS[4]];

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto overflow-x-hidden">
      <LaunchClient tallyId={tallyId} />

      <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Brand background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute right-[-120px] top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-[-120px] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="absolute left-10 top-24 hidden opacity-[0.04] lg:block">
            <Image src="/logo.png" width={220} height={220} alt="" aria-hidden />
          </div>
          <div className="absolute bottom-28 right-10 hidden rotate-12 opacity-[0.04] lg:block">
            <Image src="/logo.png" width={260} height={260} alt="" aria-hidden />
          </div>
        </div>

        {/* Top bar */}
        <header className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 pt-4 xl:px-6">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-100">
            <Link href="/launch" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 backdrop-blur">
                <Image src="/logo.png" width={28} height={28} alt="TempTake" />
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-white">TempTake</div>
                <div className="text-[11px] font-medium text-slate-400">
                  Food hygiene app for UK kitchens
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#guides"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              Guides
            </a>

            <Link
              href="/pricing"
              className="hidden items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10 sm:inline-flex"
            >
              Pricing
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </header>

        {/* HERO */}
        <section className="relative z-10 mx-auto grid w-full max-w-[1400px] gap-10 px-4 pb-16 pt-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:pb-24 md:pt-16 xl:px-6">
          <div className="max-w-[560px]">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 shadow-lg shadow-black/20 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-md">
                <Image src="/logo.png" width={30} height={30} alt="TempTake logo" />
              </div>
              <div className="leading-tight">
                <div className="text-lg font-semibold text-white">TempTake</div>
                <div className="text-xs text-slate-400">
                  Built for UK food businesses
                </div>
              </div>
            </div>

            <div className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              FSA / SFBB-aligned workflows
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                Free trial available
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Food hygiene app for UK kitchens
              <span className="block text-emerald-300">sack the paperwork.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm text-slate-200 sm:text-base">
              TempTake is a{" "}
              <span className="font-semibold">food hygiene app</span> built for UK food
              businesses. Replace paper logs with one live system for{" "}
              <span className="font-semibold">
                temperatures, cleaning, sign-offs, allergens and staff checks
              </span>
              . Staff are prompted to complete compliance tasks, managers can check in remotely
              anytime, and records stay inspection-ready every day.
            </p>

            <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 shadow-lg shadow-emerald-500/10">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Pricing starts from
              </div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-semibold leading-none text-white sm:text-5xl">
                  £9.99
                </span>
                <span className="pb-1 text-sm text-emerald-200">/ month</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                1 site. Unlimited staff logins. Unlimited devices. No per-log nonsense.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
              >
                View live demo
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
              >
                Start free trial
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20"
              >
                View pricing
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-slate-300">
              <span>✓ Mobile-friendly</span>
              <span>✓ Remote manager visibility</span>
              <span>✓ One-click reports</span>
              <span>✓ UK-focused workflows</span>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 text-xs text-slate-200 sm:text-sm md:max-w-md">
              <div>
                <dt className="text-slate-400">Built for</dt>
                <dd className="mt-0.5 font-semibold">
                  Restaurants, takeaways, pubs & cafés
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Audit trail</dt>
                <dd className="mt-0.5 font-semibold">
                  Initials • timestamps • corrective actions
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Manager visibility</dt>
                <dd className="mt-0.5 font-semibold">
                  Check in on your business remotely anytime
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Designed for</dt>
                <dd className="mt-0.5 font-semibold">Fast logging during service</dd>
              </div>
            </dl>
          </div>

          {/* HERO SCREENSHOTS */}
          <div className="md:justify-self-end">
            <div className="mx-auto max-w-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 shadow-sm">
                    <Image src="/logo.png" width={24} height={24} alt="TempTake logo" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-white">TempTake</div>
                    <div className="text-[11px] text-slate-400">
                      Live product preview
                    </div>
                  </div>
                </div>

                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                  Real screens
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-emerald-500/10">
                  <Image
                    src={heroPrimary.src}
                    alt={heroPrimary.alt}
                    width={1600}
                    height={900}
                    className="h-[230px] w-full object-cover object-top sm:h-[280px] lg:h-[320px]"
                    priority
                  />
                </div>

                {heroSecondary.map((screen) => (
                  <div
                    key={screen.src}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/30"
                  >
                    <Image
                      src={screen.src}
                      alt={screen.alt}
                      width={900}
                      height={1600}
                      className="h-[260px] w-full object-cover object-top sm:h-[300px] lg:h-[340px]"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
                Real product screens from our food hygiene app, not made-up marketing wallpaper.
              </div>
            </div>
          </div>
        </section>
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "TempTake",
      url: "https://temptake.com",
      logo: "https://temptake.com/logo.png",
    }),
  }}
/>
        {/* REPLACE PAPER */}
        <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                A food hygiene app that replaces paper logs
                <span className="text-emerald-300"> with one live dashboard.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                TempTake is a food hygiene app built to replace the messy part of daily food
                safety: half-filled sheets, missed signatures, last-minute scrambles and
                managers chasing people for records.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-lg shadow-black/30">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                  What you are replacing
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-200">
                  <li>❌ Paper temperature sheets</li>
                  <li>❌ Missed cleaning tasks</li>
                  <li>❌ Incomplete sign-offs</li>
                  <li>❌ Scrambling during inspections</li>
                  <li>❌ Guesswork about what staff actually did</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-lg shadow-black/30">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  What you get instead
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-100">
                  <li>✅ Staff prompted to complete compliance tasks</li>
                  <li>✅ Faster logging during service</li>
                  <li>✅ Daily sign-offs in one place</li>
                  <li>✅ One-click reports ready to send</li>
                  <li>✅ Clear manager visibility from anywhere</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* PRICE STRIP */}
        <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-8 xl:px-6">
            <div className="grid gap-4 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-5 shadow-lg shadow-emerald-500/5 md:grid-cols-[1.1fr_1fr] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  <Image src="/logo.png" width={18} height={18} alt="TempTake" />
                  Straightforward pricing
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  From just <span className="text-emerald-300">£9.99/month</span>
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                  Save time logging, keep managers in control remotely, and generate
                  inspection-ready reports without the paper chase using one food hygiene app.
                </p>
              </div>

              <div className="grid gap-2 text-sm text-slate-100 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                  <div className="text-slate-400">1 site</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-300">£9.99</div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                  <div className="text-slate-400">2–3 sites</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-50">£19.99</div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                  <div className="text-slate-400">4–5 sites</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-50">£29.99</div>
                </div>
                <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
                  <div className="text-emerald-200">6+ sites</div>
                  <div className="mt-1 text-base font-semibold text-emerald-100">
                    Custom pricing
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROOF / OUTCOME */}
        <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="grid gap-6 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  Show the records inspectors expect
                  <span className="text-emerald-300"> without the paperwork mess.</span>
                </h2>
                <p className="mt-3 text-sm text-slate-300 sm:text-base">
                  Clear logs. Consistent checks. Proof of corrective action. Visibility for
                  managers. One-click reports you can generate and email when needed from a
                  single food hygiene app.
                </p>

                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  <li>• Initials and timestamps on every record</li>
                  <li>• Failed temps recorded with corrective action</li>
                  <li>• Staff prompted to complete required tasks</li>
                  <li>• Reports ready to generate or email to your EHO inspector</li>
                </ul>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105"
                  >
                    View live demo
                  </Link>

                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
                  >
                    Start free trial
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <Image src="/logo.png" width={16} height={16} alt="TempTake" />
                  Audit trail preview
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <AuditRow label="Walk-in fridge" meta="3.4°C · WS · 08:15" tone="ok" />
                  <AuditRow label="Fish prep bench" meta="11.8°C · JB · 10:32" tone="bad" />
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-[12px] text-rose-100">
                    <div className="font-semibold">Corrective action recorded</div>
                    <div className="mt-1 text-rose-200/90">
                      Moved food to working fridge, engineer called, re-check 3.6°C logged.
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    The point is not pretty records. The point is records you can actually show.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Simple for staff.
                <span className="text-emerald-300"> Useful for managers.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                TempTake is a food hygiene app built around what actually happens in kitchens:
                quick checks, busy shifts, missed paperwork, and managers needing visibility
                without chasing everyone.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <StepCard
                number="01"
                title="Set up your locations and checks"
                description="Create your routines, cleaning tasks, allergen controls and training records around how your business already works."
              />
              <StepCard
                number="02"
                title="Staff are prompted to complete tasks"
                description="Temperatures, cleaning and daily compliance checks stay visible so records are completed on time instead of being left until later."
              />
              <StepCard
                number="03"
                title="Managers check in remotely anytime"
                description="See what is done, what is overdue and what needs attention without being on site to chase people."
              />
            </div>
          </div>
        </section>

        {/* DEMO PUSH */}
        <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="grid gap-6 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 shadow-lg shadow-emerald-500/5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                  <Image src="/logo.png" width={16} height={16} alt="TempTake" />
                  Live product demo
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  See a real kitchen dashboard
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                  No sign-up. No fake walkthrough. Just open the demo and explore a working
                  food hygiene app with temperatures, cleaning, incidents, sign-offs, training
                  and manager visibility.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105"
                >
                  Open demo dashboard
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
                >
                  Start free trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SCREENSHOT GALLERY */}
        <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                What the food hygiene app actually looks like.
                <span className="text-emerald-300"> Imagine that.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                Real screens from TempTake showing temperature logs, cleaning workflows, allergen
                controls, training records and site visibility.
              </p>
            </div>

            <div className="mt-8 grid auto-rows-[1fr] gap-5 md:grid-cols-2 xl:grid-cols-3">
              {SCREENSHOTS.map((screen) => (
                <div
                  key={screen.src}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/30"
                >
                  <div className="overflow-hidden border-b border-slate-800">
                    <Image
                      src={screen.src}
                      alt={screen.alt}
                      width={screen.orientation === "landscape" ? 1600 : 900}
                      height={screen.orientation === "landscape" ? 900 : 1600}
                      className={cls(
                        "w-full object-cover",
                        screen.orientation === "landscape"
                          ? "h-[220px] object-top"
                          : "h-[520px] object-top"
                      )}
                    />
                  </div>
                  <div className="p-4">
                    <div className="inline-flex items-center gap-2 text-[11px] text-slate-500">
                      <Image src="/logo.png" width={14} height={14} alt="TempTake" />
                      TempTake
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-slate-50">{screen.title}</h3>
                    <p className="mt-2 text-sm text-slate-300">{screen.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURE GRID */}
        <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-12 md:py-16 xl:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Everything your kitchen needs
                <span className="text-emerald-300"> to stay compliant.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                This food hygiene app keeps daily records fast for staff and useful for managers.
                No more unreadable sheets, missing initials or “we’ll do it later” turning into
                “we never did it”.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <FeatureCard
                title="Faster temperature logging"
                pill="Fridges, freezers & hot hold"
                description="Save time logging checks during service with fast entries, clear pass/fail status and corrective actions."
              />
              <FeatureCard
                title="Staff task prompting"
                pill="Front & back of house"
                description="Staff are prompted to complete and record compliance tasks so less gets missed and less gets chased."
              />
              <FeatureCard
                title="Remote business visibility"
                pill="Manager dashboard"
                description="Check in on your business remotely anytime and see what is complete, overdue or falling behind."
              />
              <FeatureCard
                title="One-click reports"
                pill="Inspection-ready"
                description="Generate a report quickly and email records when an EHO inspector needs to see them."
              />
            </div>
          </div>
        </section>

        {/* GUIDES */}
        <section id="guides" className="relative z-10 border-t border-white/10 bg-slate-950">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
            <div className="mb-6 max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Practical guides your team can actually use.
                <span className="text-emerald-300"> No fluff.</span>
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Useful whether you use TempTake yet or not. Built around UK expectations and real
                kitchen workflows.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {GUIDES.map((g) => (
                <Link
                  key={g.title}
                  href={g.href}
                  className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30 hover:bg-slate-900/80"
                >
                  <div className="inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                    {g.pill}
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-50">{g.title}</h3>
                    <span className="text-xs text-slate-400 group-hover:text-emerald-300">
                      Read →
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{g.description}</p>
                  <p className="mt-3 text-[11px] text-slate-500">Public guide · share with staff</p>
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105"
              >
                View live demo
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>

        <FAQSection />

        {/* OPTIONAL CONTACT / HUMAN HELP */}
        <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-10 xl:px-6">
            <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                  Prefer a quick walkthrough first?
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  If you want to see how TempTake would work in your kitchen before starting, book a
                  quick intro and we’ll show you the core workflow.
                </p>
              </div>

              <button
                type="button"
                {...tallyAttrs}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
              >
                Book a walkthrough
              </button>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative z-10 border-t border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center md:py-20">
            <div className="mx-auto mb-4 flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 shadow-sm">
                <Image src="/logo.png" width={22} height={22} alt="TempTake logo" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-sm font-semibold text-white">TempTake</div>
                <div className="text-[11px] text-slate-400">Built for UK food businesses</div>
              </div>
            </div>

            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Save time logging.
              <span className="block text-emerald-300">Stay ready when inspection day comes.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
              TempTake is a food hygiene app that makes records easier to complete, easier to review
              and easier to send when someone asks. Staff get prompted, managers stay informed, and
              reports are ready fast.
            </p>

            <div className="mt-5 text-sm text-slate-300">
              Plans from <span className="font-semibold text-emerald-300">£9.99/month</span>.
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105"
              >
                View live demo
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
              >
                Start free trial
              </Link>
            </div>

            <p className="mt-4 text-[12px] text-slate-500">
              View the demo now, or book a walkthrough if you want to see it with your workflow in mind.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative z-10 border-t border-white/10 bg-slate-950">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between xl:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Image src="/logo.png" width={22} height={22} alt="TempTake logo" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">TempTake</div>
                <div className="text-[11px] text-slate-500">
                  © {new Date().getFullYear()} · Food hygiene app for UK kitchens
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span>Made for UK food businesses.</span>

              <a href="#guides" className="text-slate-300 hover:text-emerald-300">
                Guides
              </a>

              <Link href="/demo" className="text-slate-300 hover:text-emerald-300">
                Demo
              </Link>

              <Link href="/signup" className="text-slate-300 hover:text-emerald-300">
                Free trial
              </Link>

              <span className="hidden sm:inline text-slate-700">|</span>

              <Link href="/terms" className="text-slate-300 hover:text-emerald-300">
                Terms
              </Link>
              <Link href="/privacy" className="text-slate-300 hover:text-emerald-300">
                Privacy
              </Link>
              <Link href="/cookies" className="text-slate-300 hover:text-emerald-300">
                Cookies
              </Link>
              <Link href="/help" className="text-slate-300 hover:text-emerald-300">
                Support
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "Do I still need Safer Food Better Business (SFBB)?",
      a: "SFBB is still the recognised system in many UK businesses. TempTake helps you run daily checks and keep records in a way that aligns with SFBB expectations, but it does not remove your legal responsibilities.",
    },
    {
      q: "What does an EHO expect to see during an inspection?",
      a: "Consistent records, initials and timestamps, sensible check frequency, evidence of corrective action where something fails, and a system staff actually follow in practice.",
    },
    {
      q: "What happens if a temperature fails?",
      a: "TempTake flags it and lets you record a corrective action, with an optional re-check temperature. That gives you a cleaner audit trail than a crossed-out number on paper.",
    },
    {
      q: "Can I export logs if I need to show them?",
      a: "Yes. The point is to make records easier to review and easier to produce when needed.",
    },
    {
      q: "Can staff log checks without a manager?",
      a: "Yes. Staff can log temperatures and cleaning with initials, while managers can see what is missing and what needs attention.",
    },
    {
      q: "Does it work for multi-site groups?",
      a: "Yes. TempTake is designed to work for single-site operators and businesses managing multiple locations.",
    },
  ];

  return (
    <section id="faq" className="relative z-10 border-t border-white/10 bg-slate-950/90">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-12 md:py-16 xl:px-6">
        <div className="mb-6 max-w-3xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            FAQs kitchens actually ask.
            <span className="text-emerald-300"> Not marketing fluff.</span>
          </h2>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Straight answers to the stuff that matters when you are trying to stay compliant and
            keep service moving.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30 open:bg-slate-900/80"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-50">
                <span className="inline-flex items-start justify-between gap-3">
                  <span>{f.q}</span>
                  <span className="text-slate-400 group-open:text-emerald-300">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-300">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  title,
  description,
  pill,
}: {
  title: string;
  description: string;
  pill: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-lg shadow-black/40">
      <div className="inline-flex w-fit items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
        {pill}
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-xs text-slate-300 sm:text-sm">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/30">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
        {number}
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </div>
  );
}

function AuditRow({
  label,
  meta,
  tone,
}: {
  label: string;
  meta: string;
  tone: "ok" | "bad";
}) {
  const badge =
    tone === "ok"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
      : "bg-rose-500/15 text-rose-200 border-rose-500/20";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 px-3 py-2">
      <div>
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        <div className="text-[11px] text-slate-400">{meta}</div>
      </div>
      <span className={cls("rounded-full border px-2 py-1 text-[10px] font-semibold", badge)}>
        {tone === "ok" ? "In range" : "Fail"}
      </span>
    </div>
  );
}