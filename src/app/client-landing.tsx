// src/app/launch/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";

/* ---------------------- FAKE SOCIAL PROOF WALL DATA ---------------------- */

const fakeNotes = [
  { initials: "JB", message: "The pulsing FAB saves so much time 🔥" },
  { initials: "SC", message: "Finally… something my team actually wants to use" },
  { initials: "MK", message: "Paper logs are on the char-grill" },
  { initials: "TR", message: "Take my money already" },
  { initials: "DW", message: "Saved me 90 mins today. 90!" },
  { initials: "RH", message: "Just beat my CDP to top spot on the leaderboard" },
  { initials: "LF", message: "EHO walked in, pressed one button, walked out happy" },
  { initials: "NP", message: "i can see how my kitchen is running from home" },
];

/* ---------------------- PUBLIC GUIDES (LAUNCH PAGE) ---------------------- */
/**
 * Update hrefs if your actual routes differ.
 * Keep these public (no auth required) so visitors can read before signing up.
 */const GUIDES = [
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

/* ---------------------------- MAIN PAGE ---------------------------- */

export default function LaunchPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto overflow-x-hidden">
      {/* Tally embed script */}
      <Script src="https://tally.so/widgets/embed.js" async />

      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Top bar with login */}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.png" width={44} height={44} alt="TempTake" />
              <span className="font-semibold">TempTake</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* NEW: Guides link (public) */}
            <a
              href="#guides"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              Guides
            </a>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              Log in
            </Link>
          </div>
        </header>

        {/* ----------------------- HERO SECTION ----------------------- */}
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 md:flex-row md:items-center md:pb-24 md:pt-16">
          <div className="md:w-1/2">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Early access for beta testers · Coming soon
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                🎙 Voice entry
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Food safety checks
              <span className="block text-emerald-300">done properly.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm text-slate-200 sm:text-base">
              TempTake is your food hygiene compliance assistant. It replaces messy paper logs with simple daily routines for{" "}
              <span className="font-semibold">temperatures, cleaning and allergens</span>.
              <span className="block mt-2 text-slate-200">
                And when hands are full? Use{" "}
                <span className="font-semibold text-emerald-200">voice entry</span>{" "}
                to log checks faster without fighting a screen mid-service.
              </span>
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* Tally modal trigger – hero CTA */}
              <button
                type="button"
                data-tally-open="obb4vX"
                data-tally-layout="modal"
                data-tally-emoji-text="👋"
                data-tally-emoji-animation="wave"
                data-tally-auto-close="0"
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
              >
                Join the early access list
              </button>

              {/* View demo dashboard – goes to /app */}
              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
              >
                View demo dashboard
              </Link>

              {/* Open staff interactions demo modal */}
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20"
              >
                Leaderboard & the wall
              </button>

              {/* NEW: quick jump to guides */}
              <a
                href="#guides"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-2 text-[11px] font-medium text-slate-200 hover:bg-slate-800/40"
              >
                Read the guides
              </a>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 text-xs text-slate-200 sm:text-sm md:max-w-md">
              <div>
                <dt className="text-slate-400">Built for</dt>
                <dd className="mt-0.5 font-semibold">
                  Restaurants, bistros, pubs & takeaways
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">What it covers</dt>
                <dd className="mt-0.5 font-semibold">
                  Temps • Cleaning • Allergens • Training • EHO admin
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Fast input</dt>
                <dd className="mt-0.5 font-semibold">Tap, swipe, or voice</dd>
              </div>
              <div>
                <dt className="text-slate-400">Launch</dt>
                <dd className="mt-0.5 font-semibold">App Store & web, 2026</dd>
              </div>
            </dl>
          </div>

          {/* ----------------------- PHONE PREVIEW ----------------------- */}
          <div className="md:w-1/2">
            <div className="mx-auto max-w-md rounded-[2rem] border border-white/15 bg-slate-900/70 p-4 shadow-2xl shadow-emerald-500/20 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-500 text-xs font-bold text-slate-950">
                    TT
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-50">TempTake</div>
                    <div className="text-[11px] text-slate-400">Demo kitchen · Today</div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-medium text-emerald-300">
                  Compliant
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <PreviewPill title="Temps today" value="12" glow />
                <PreviewPill title="Cleaning" value="8/10" />
                <PreviewPill title="Allergen review" value="Due in 7d" amber />
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Today’s checks
                  </span>
                  <span className="text-[11px] text-slate-500">Swipe to complete</span>
                </div>

                <div className="space-y-1.5">
                  <MockLogRow label="Walk-in fridge" temp="3.4°C" status="pass" time="08:15" />
                  <MockLogRow
                    label="Chicken curry (hot hold)"
                    temp="62.0°C"
                    status="pass"
                    time="12:05"
                  />
                  <MockLogRow label="Fish prep bench" temp="11.8°C" status="fail" time="10:32" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105">
                  + Quick temp log
                </button>
                <button className="rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-800/80">
                  🎙 Voice log
                </button>
                <button className="col-span-2 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-800/80">
                  Open cleaning rota
                </button>
              </div>

              <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
                Voice entry: “Walk-in fridge 3.4 degrees, initials WS” → logged with timestamp.
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------- FEATURE GRID ----------------------- */}
        <section className="border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 md:py-16">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Everything you need to ACE inspections,
                <span className="text-emerald-300"> in one place.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                TempTake keeps daily checks simple and fast. No more chasing clipboards, half-filled log sheets,
                or “we’ll do it later” turning into “we never did it”.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <FeatureCard
                title="Temperature logging"
                pill="Fridges, freezers & hot hold"
                description="One-tap logging with pre-set routines. Cuts staff time and keeps records inspection-ready."
              />
              <FeatureCard
                title="Cleaning rota"
                pill="Front & back of house"
                description="Daily, weekly and monthly tasks on your phone. Swipe to complete and see what’s still open."
              />
              <FeatureCard
                title="Allergen & training"
                pill="Matrix & certificates"
                description="Track allergy info and staff training so nothing quietly expires and bites you later."
              />
              <FeatureCard
                title="Voice entry"
                pill="Hands busy? No problem"
                description="Log temperatures by speaking. Faster during service, fewer missed checks, and still fully auditable."
              />
            </div>
          </div>
        </section>

        {/* ----------------------- NEW: GUIDES SECTION ----------------------- */}
        <section id="guides" className="border-t border-white/10 bg-slate-950">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="mb-6 max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Guides for your team,
                <span className="text-emerald-300"> before they even sign up.</span>
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Short, practical docs you can share with staff. No fluff, no “synergy”.
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
                  <p className="mt-3 text-[11px] text-slate-500">
                    Public guide · share with staff
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------- APP STORE STYLE BLOCKS ----------------------- */}
        <AppStoreFeatureBlocks />

        {/* ----------------------- ONBOARDING STEPS ----------------------- */}
        <section className="border-t border-white/10 bg-slate-900/90">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="mb-6 max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                From zero to running checks in one shift.
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Built so a busy kitchen can go from “never seen this before” to
                “we’re doing today&apos;s checks in here” inside a single service.
              </p>
            </div>

            <ol className="grid gap-4 md:grid-cols-3">
              <StepCard
                step="First 10 minutes"
                title="Add your kitchen"
                body="Add your kitchen, set up routines, cleaning rota and allergen info. Sensible defaults so you’re not starting from blank."
              />
              <StepCard
                step="Next 20 minutes"
                title="Get the team on"
                body="Share TempTake with chefs and FOH. They see clear checklists with initials and times, not a wall of settings."
              />
              <StepCard
                step="During service"
                title="Run live checks"
                body="Tap, swipe or use voice entry to log checks. By close, you’ve got a full digital record without anyone touching a clipboard."
              />
            </ol>
          </div>
        </section>

        {/* ----------------------- NEON GLOW WALL ----------------------- */}
        <StagedWall />

        {/* ----------------------- DEMO VIDEO SECTION ----------------------- */}
        <section className="border-t border-white/10 bg-slate-950/90">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-center md:py-16">
            <div className="space-y-3 md:w-1/2">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                See TempTake in action in 60 seconds.
              </h2>
              <p className="text-sm text-slate-300 sm:text-base">
                A quick walkthrough of how a chef logs temperatures, completes cleaning
                tasks and keeps allergen info up to date.
              </p>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>• Realistic example of a lunch service.</li>
                <li>• How managers see what’s been missed.</li>
                <li>• What your EHO will see during a visit.</li>
              </ul>
            </div>

            <div className="md:w-1/2">
              <div className="relative mx-auto aspect-video w-full max-w-xl overflow-hidden rounded-3xl border border-emerald-400/40 bg-slate-900 shadow-[0_0_45px_rgba(16,185,129,0.45)]">
                <video
                  className="h-full w-full object-cover"
                  controls
                  poster="/demo/temptake-poster.jpg"
                >
                  <source src="/demo/temptake-demo.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-emerald-200">
                  Demo recording · TempTake
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Don&apos;t have a video yet? This block still looks fine. Swap the file when you&apos;re ready.
              </p>
            </div>
          </div>
        </section>

        {/* ----------------------- PRICING SECTION ----------------------- */}
        <section id="pricing" className="border-t border-white/10 bg-slate-950">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="mb-8 max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Simple pricing when we launch.
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                During early access, we&apos;re working closely with a small group of kitchens.
                When we launch publicly, pricing is banded by how many locations you run in
                TempTake. No per-log or per-device nonsense.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Early access card */}
              <div className="relative flex flex-col rounded-2xl border border-emerald-500/40 bg-slate-950/80 p-5 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <div className="inline-flex w-fit items-center rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Founding kitchens
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  Early access programme
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Limited number of sites working directly with us to shape the product.
                </p>

                <div className="mt-4 text-3xl font-semibold text-emerald-300">
                  £0
                  <span className="text-sm font-normal text-slate-300"> during beta</span>
                </div>

                <ul className="mt-4 space-y-1.5 text-sm text-slate-200">
                  <li>• Full access to TempTake features.</li>
                  <li>• Priority support and feature input.</li>
                  <li>• Preferential launch pricing afterwards.</li>
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
              </div>

              {/* Future pricing card */}
              <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="inline-flex w-fit items-center rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Monthly pricing
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  From £9.99 / month
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Pricing is banded by the number of locations on your account:
                </p>

                <ul className="mt-4 space-y-1.5 text-sm text-slate-200">
                  <li>• 1 site → £9.99 / month</li>
                  <li>• 2–3 sites → £19.99 / month</li>
                  <li>• 4–5 sites → £29.99 / month</li>
                  <li>• 6+ sites → custom pricing, contact us</li>
                </ul>

                <p className="mt-4 text-[11px] text-slate-500">
                  Every band includes unlimited logs, staff and devices, plus all core modules:
                  temperatures, cleaning, allergens and basic training records.
                </p>

                <p className="mt-4 text-[11px] text-slate-400">
                  Want the full breakdown?{" "}
                  <Link
                    href="/pricing"
                    className="font-semibold text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
                  >
                    View detailed pricing
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------- WAITLIST (TALLY) ----------------------- */}
        <section id="waitlist" className="border-t border-white/10 bg-slate-950/95">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  Be one of the first kitchens using TempTake.
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
                  We’re finishing the first production version now. Tap below and drop your
                  details to get early access.
                </p>

                <button
                  type="button"
                  data-tally-open="obb4vX"
                  data-tally-layout="modal"
                  data-tally-emoji-text="👋"
                  data-tally-emoji-animation="wave"
                  data-tally-auto-close="0"
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105"
                >
                  Join early access list
                </button>

                <p className="mt-2 text-[11px] text-slate-400">
                  Powered by Tally. No spam, ever. We’ll only email you when TempTake is ready.
                </p>

                <p className="mt-4 text-[11px] text-slate-400">
                  Want to see how it looks?{" "}
                  <Link
                    href="/app"
                    className="font-semibold text-emerald-300 underline underline-offset-2 hover:text-emerald-200"
                  >
                    View the demo dashboard
                  </Link>
                  .
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-sm text-slate-200 shadow-lg shadow-black/40">
                <h3 className="text-sm font-semibold text-slate-50">
                  Built for UK food safety
                </h3>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <li>• Designed around real EHO expectations.</li>
                  <li>• Works for independents and multi-site groups.</li>
                  <li>• Clear, exportable records you can show at any time.</li>
                  <li>• Voice entry reduces missed checks under pressure.</li>
                </ul>
                <p className="mt-3 text-[11px] text-slate-500">
                  TempTake does not replace your legal responsibilities. It just makes compliance harder to mess up.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------- FOOTER ----------------------- */}
        <footer className="border-t border-white/10 bg-slate-950">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div>© {new Date().getFullYear()} TempTake. All rights reserved.</div>
            <div className="flex flex-wrap items-center gap-3">
              <span>Made for UK food businesses.</span>
              <a href="#guides" className="text-slate-300 hover:text-emerald-300">
                Guides
              </a>
              <button
                type="button"
                data-tally-open="obb4vX"
                data-tally-layout="modal"
                data-tally-emoji-text="👋"
                data-tally-emoji-animation="wave"
                data-tally-auto-close="0"
                className="text-slate-300 hover:text-emerald-300"
              >
                Join early access
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* ----------------------- STAFF INTERACTIONS / LEADERBOARD MODAL ----------------------- */}
      {demoOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="relative flex w-full max-w-5xl flex-col gap-4 rounded-3xl border border-emerald-500/50 bg-slate-950 p-4 shadow-[0_0_60px_rgba(16,185,129,0.7)] md:p-6">
            <button
              type="button"
              onClick={() => setDemoOpen(false)}
              className="absolute right-4 top-3 rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>

            <div className="flex flex-col gap-5 md:flex-row">
              {/* LEFT */}
              <div className="space-y-3 md:w-2/5">
                <h3 className="text-lg font-semibold text-white">
                  How your team makes this fun.
                </h3>
                <p className="text-sm text-slate-300">
                  TempTake isn't just boxes to tick. Your team see streaks, friendly
                  competition and little wins for doing the boring stuff properly.
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>• Staff earn streaks for consistent logging.</li>
                  <li>• Leaderboard shows who&apos;s smashing their checks.</li>
                  <li>• Shout-outs wall celebrates the good days.</li>
                  <li>• Managers still see the serious side: what was done and when.</li>
                </ul>

                <Link
                  href="/demo-wall"
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
                >
                  Open full demo wall
                </Link>
              </div>

              {/* RIGHT */}
              <div className="md:w-3/5">
                <div className="space-y-4 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-900 via-slate-950 to-slate-950 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                        Kitchen wall · Demo kitchen
                      </p>
                      <p className="text-sm font-semibold text-white">
                        Team standings (preview)
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-medium text-emerald-200">
                      For fun · not HR
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="space-y-2 rounded-xl border border-amber-400/40 bg-amber-900/40 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                          Top streaks
                        </p>
                        <span className="rounded-full bg-black/40 px-2 py-1 text-[10px] text-amber-100">
                          Example only
                        </span>
                      </div>

                      <MiniLeaderRow
                        rank={1}
                        initials="JB"
                        name="Jess (CDP)"
                        streak="23-day streak"
                        temps="18 temps · 4 cleans today"
                        tone="gold"
                      />
                      <MiniLeaderRow
                        rank={2}
                        initials="SC"
                        name="Sam (Sous Chef)"
                        streak="17-day streak"
                        temps="14 temps · 3 cleans today"
                        tone="silver"
                      />
                      <MiniLeaderRow
                        rank={3}
                        initials="MK"
                        name="Maya (FOH)"
                        streak="9-day streak"
                        temps="Allergen checks every service"
                        tone="bronze"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Shout-outs wall (demo)
                      </p>
                      <div className="space-y-3">
                        <MiniStickyNote
                          initials="JB"
                          bg="bg-yellow-200"
                          message="Adjusted temp on double fridge. Zero drama on a fully booked Saturday 🔥"
                        />
                        <MiniStickyNote
                          initials="LF"
                          bg="bg-pink-200"
                          message="Stayed late to deep clean pass & walk-in. EHO would cry with joy."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              This is a non-functional preview. In the real app, this leaderboard and wall
              update automatically as your team complete their checks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------- APP STORE STYLE BLOCKS ----------------------- */

function AppStoreFeatureBlocks() {
  return (
    <section className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 md:py-16">
        {/* NEW: Voice block */}
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="md:w-1/2">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/60 shadow-[0_0_45px_rgba(16,185,129,0.45)]">
              <div className="absolute inset-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <div className="mb-3 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="rounded-full bg-slate-800 px-2 py-1">Voice entry</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">
                    Logged
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="rounded-lg bg-slate-800/60 px-2 py-2 text-slate-200">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">
                      You said
                    </div>
                    <div className="mt-1 font-medium text-slate-100">
                      “Walk-in fridge 3.4 degrees, initials WS”
                    </div>
                  </div>
                  <FakeRow label="Walk-in fridge" value="3.4°C · WS · 08:15" />
                  <FakeRow label="Under-counter fridge" value="4.2°C · JB · 08:18" />
                  <FakeRow label="Freezer 1" value="-18.6°C · SC · 08:21" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 md:w-1/2">
            <h2 className="text-2xl font-semibold text-white">
              Voice entry for real kitchens.
            </h2>
            <p className="text-sm text-slate-300 sm:text-base">
              When service is chaos and hands are full, you still need clean records.
              Voice entry lets staff log checks faster without dodgy shortcuts.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>• Faster logging during service.</li>
              <li>• Still stores initials + timestamps.</li>
              <li>• Reduces “we forgot” moments.</li>
            </ul>
          </div>
        </div>

        {/* Block 1 */}
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="md:w-1/2">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/60 shadow-[0_0_45px_rgba(16,185,129,0.45)]">
              <div className="absolute inset-4 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <div className="mb-3 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="rounded-full bg-slate-800 px-2 py-1">Fridges</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200">
                    All in range
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <FakeRow label="Walk-in fridge" value="3.4°C" />
                  <FakeRow label="Under-counter fridge" value="4.2°C" />
                  <FakeRow label="Freezer 1" value="-18.6°C" />
                  <FakeRow label="Dessert fridge" value="5.0°C" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 md:w-1/2">
            <h2 className="text-2xl font-semibold text-white">
              Temperatures in one clean view.
            </h2>
            <p className="text-sm text-slate-300 sm:text-base">
              Every fridge, freezer and hot hold point laid out clearly. Your team see
              exactly what needs logging and when, and you see what&apos;s been missed.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>• Built-in pass / fail ranges for common equipment.</li>
              <li>• Clear initials and timestamps on every log.</li>
              <li>• Designed for busy kitchens, one-handed.</li>
            </ul>
          </div>
        </div>

        {/* Block 2 */}
        <div className="flex flex-col-reverse items-center gap-8 md:flex-row">
          <div className="space-y-3 md:w-1/2">
            <h2 className="text-2xl font-semibold text-white">
              Cleaning rota that actually gets done.
            </h2>
            <p className="text-sm text-slate-300 sm:text-base">
              Instead of a laminated sheet nobody reads, TempTake puts daily, weekly and
              monthly tasks directly in front of your team.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>• Simple indicator of what tasks need completing when.</li>
              <li>• Staff incentivised upon completing tasks with points.</li>
              <li>• Swipe to complete with initials and time.</li>
              <li>• Managers see overdue tasks instantly.</li>
            </ul>
          </div>

          <div className="md:w-1/2">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-sky-400/40 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900/60 shadow-[0_0_45px_rgba(56,189,248,0.45)]">
              <div className="absolute inset-4 rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-slate-200">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                  Cleaning rota
                </p>
                <FakeTask label="Pass through dishwasher area" done />
                <FakeTask label="Deep clean grill & flat top" />
                <FakeTask label="Sanitise walk-in handles" />
              </div>
            </div>
          </div>
        </div>

        {/* Block 3 */}
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="md:w-1/2">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900/60 shadow-[0_0_45px_rgba(251,191,36,0.45)]">
              <div className="absolute inset-4 rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-[11px] text-slate-200">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Allergen & training
                </p>
                <p className="mb-1 text-[11px] text-emerald-200">
                  • Allergen matrix: in date
                </p>
                <p className="mb-1 text-[11px] text-amber-200">
                  • FOH briefing: due in 7 days
                </p>
                <p className="text-[11px] text-rose-200">
                  • 1 staff training file overdue
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 md:w-1/2">
            <h2 className="text-2xl font-semibold text-white">
              Allergen & training in one glance.
            </h2>
            <p className="text-sm text-slate-300 sm:text-base">
              No more wondering when you last updated the allergen matrix, or whether
              everyone&apos;s Level 2 is still in date.
            </p>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li>• Keep allergy info up to date and clear.</li>
              <li>• Track allergen matrix reviews by date.</li>
              <li>• Keep staff training records together and get reminders.</li>
              <li>• Show an EHO you have a system, not chaos.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------- NEON GLOW WALL COMPONENT ----------------------- */

function StagedWall() {
  return (
    <section className="border-t border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-24">
      <div className="mb-14 mx-auto max-w-5xl px-4 text-center">
        <h2 className="mb-4 text-4xl font-extrabold text-white md:text-6xl">
          Chefs are already losing their minds
        </h2>
        <p className="text-lg text-slate-300 md:text-xl">
          (Real reactions from the first kitchens testing TempTake)
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 md:grid-cols-2 lg:grid-cols-3">
        {fakeNotes.map((note, i) => (
          <div
            key={i}
            className="relative rounded-3xl border border-emerald-400/60 bg-slate-950/80 p-8 shadow-[0_0_40px_rgba(34,197,94,0.45)] transition-all duration-300 hover:-rotate-1 hover:scale-105 md:p-9"
            style={{ transform: `rotate(${Math.sin(i * 0.7) * 4}deg)` }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="text-4xl font-black text-emerald-300">{note.initials}</div>
              <span className="rounded-full border border-emerald-400/70 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Chef reaction
              </span>
            </div>
            <p className="whitespace-pre-wrap text-xl leading-relaxed text-slate-100">
              “{note.message}”
            </p>
            <div className="mt-8 flex justify-end gap-1 text-2xl">
              <span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span><span>🔥</span>
            </div>

            <div className="pointer-events-none absolute -inset-px rounded-3xl border border-emerald-400/20 blur-[2px]" />
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-xl font-semibold text-emerald-200 md:text-2xl">
          Be the next name on this wall.
        </p>
      </div>
    </section>
  );
}

/* ----------------------- SMALL PRESENTATIONAL COMPONENTS ----------------------- */

function PreviewPill({
  title,
  value,
  glow,
  amber,
}: {
  title: string;
  value: string;
  glow?: boolean;
  amber?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        glow
          ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
          : amber
          ? "border-amber-400/60 bg-amber-400/10"
          : "border-slate-700 bg-slate-800/70"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-50">{value}</div>
    </div>
  );
}

function MockLogRow({
  label,
  temp,
  status,
  time,
}: {
  label: string;
  temp: string;
  status: "pass" | "fail";
  time: string;
}) {
  const ok = status === "pass";
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2">
      <div>
        <div className="text-[12px] font-medium text-slate-50">{label}</div>
        <div className="mt-0.5 text-[11px] text-slate-400">Logged at {time}</div>
      </div>
      <div className="text-right">
        <div className="text-[13px] font-semibold text-slate-50">{temp}</div>
        <span
          className={
            "mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium " +
            (ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/20 text-red-200")
          }
        >
          {ok ? "Pass" : "Check"}
        </span>
      </div>
    </div>
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
  step,
  title,
  body,
}: {
  step: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm shadow-lg shadow-black/40">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-semibold text-emerald-300">
          ✓
        </span>
        <span className="uppercase tracking-[0.15em]">{step}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-xs text-slate-300 sm:text-sm">{body}</p>
    </li>
  );
}

/* ---- App-store fake blocks bits ---- */

function FakeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-800/60 px-2 py-1.5">
      <span className="text-[11px] text-slate-200">{label}</span>
      <span className="text-[11px] font-semibold text-emerald-300">{value}</span>
    </div>
  );
}

function FakeTask({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900/70 px-2 py-1.5">
      <span className="text-[11px] text-slate-200">{label}</span>
      <span className={"h-2 w-2 rounded-full " + (done ? "bg-emerald-400" : "bg-slate-500")} />
    </div>
  );
}

/* ---- Mini leaderboard + shout-out components for modal ---- */

function MiniLeaderRow({
  rank,
  initials,
  name,
  streak,
  temps,
  tone,
}: {
  rank: number;
  initials: string;
  name: string;
  streak: string;
  temps: string;
  tone: "gold" | "silver" | "bronze";
}) {
  const badge =
    tone === "gold"
      ? "bg-amber-400 text-amber-950"
      : tone === "silver"
      ? "bg-slate-200 text-slate-900"
      : "bg-orange-400 text-orange-950";

  return (
    <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 text-[11px] text-slate-200">
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${badge}`}>
          {rank}
        </span>
        <div>
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold">
              {initials}
            </span>
            <span className="font-medium">{name}</span>
          </div>
          <p className="text-[10px] text-slate-400">{streak}</p>
        </div>
      </div>
      <span className="text-[10px] text-emerald-200">{temps}</span>
    </div>
  );
}

function MiniStickyNote({
  initials,
  bg,
  message,
}: {
  initials: string;
  bg: string;
  message: string;
}) {
  return (
    <div
      className={`relative rounded-3xl p-4 text-[11px] text-slate-900 shadow-[0_12px_24px_rgba(0,0,0,0.35)] ${bg}`}
      style={{ transform: "rotate(-2deg)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
            {initials}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-slate-700">
            Shout-out
          </span>
        </div>
        <span className="text-[10px] text-slate-700/70">Demo note</span>
      </div>
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
