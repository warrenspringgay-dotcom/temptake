// src/app/launch/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Script from "next/script";

/* ---------------------- FAKE SOCIAL PROOF WALL DATA ---------------------- */

const fakeNotes = [
  { initials: "JB", message: "The pulsing FAB is actual chef crack 🔥" },
  { initials: "SC", message: "Finally… something my team actually wants to use" },
  { initials: "MK", message: "Paper logs can die in a fire" },
  { initials: "TR", message: "Take my money already" },
  { initials: "DW", message: "Saved me 90 mins today. 90!" },
  { initials: "RH", message: "My CDP just high-fived me for logging a temp" },
  { initials: "LF", message: "EHO walked in, pressed one button, walked out happy" },
  { initials: "NP", message: "This is the Slack we actually needed" },
];

/* ---------------------------- MAIN PAGE ---------------------------- */

export default function LaunchPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    // Add overflow-x-hidden so nothing makes the page scroll sideways on mobile
    <div className="fixed inset-0 z-20 overflow-y-auto overflow-x-hidden">
      {/* Tally embed script */}
      <Script src="https://tally.so/widgets/embed.js" async />

      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* ----------------------- HERO SECTION ----------------------- */}
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 md:flex-row md:items-center md:pb-24 md:pt-16">
          <div className="md:w-1/2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Early access for beta testers · Coming soon
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Food safety checks
              <span className="block text-emerald-300">done properly.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm text-slate-200 sm:text-base">
              TempTake replaces messy paper logs with simple daily routines for{" "}
              <span className="font-semibold">temperatures, cleaning and allergens</span>.
              Built for real UK kitchens that just need it sorted.
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
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 text-xs text-slate-200 sm:text-sm md:max-w-md">
              <div>
                <dt className="text-slate-400">Built for</dt>
                <dd className="mt-0.5 font-semibold">Restaurants, bistros, pubs & takeaways</dd>
              </div>
              <div>
                <dt className="text-slate-400">What it covers</dt>
                <dd className="mt-0.5 font-semibold">
                  Temps • Cleaning • Allergy info • EHO admin
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Works on</dt>
                <dd className="mt-0.5 font-semibold">Any phone, tablet or PC</dd>
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

              <div className="mt-5 flex gap-2">
                <button className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105">
                  + Quick temp log
                </button>
                <button className="flex-1 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-800/80">
                  Open cleaning rota
                </button>
              </div>
            </div>
          </div>
        </section>

      

        {/* ----------------------- FEATURE GRID ----------------------- */}
        <section className="border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 md:py-16">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Everything your EHO wants to see,
                <span className="text-emerald-300"> in one place.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                TempTake keeps daily checks simple so your team actually keep up with
                them. No more chasing clipboards or half-filled log sheets.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard
                title="Temperature logging"
                pill="Fridges, freezers & hot hold"
                description="One-tap logging with built-in pass / fail ranges and simple trends so you can show a clear record at any time."
              />
              <FeatureCard
                title="Cleaning rota"
                pill="Front & back of house"
                description="Daily, weekly and monthly tasks that live on your phone. Swipe to complete and see what’s still outstanding."
              />
              <FeatureCard
                title="Allergen & training"
                pill="Matrix & certificates"
                description="Keep track of allergen reviews and staff food safety training so nothing quietly expires in the background."
              />
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
                Your first week with TempTake.
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                We built TempTake so you can get from “never used this” to “this runs our
                checks” in under a week.
              </p>
            </div>

            <ol className="grid gap-4 md:grid-cols-3">
              <StepCard
                step="Day 1"
                title="Add your kitchen"
                body="Set up fridges, freezers, hot hold, cleaning areas and key allergen items. We’ll help you with sensible defaults."
              />
              <StepCard
                step="Day 2–3"
                title="Get the team on"
                body="Share the app with your chefs and front-of-house. They’ll see exactly what needs doing, and when."
              />
              <StepCard
                step="Day 4–7"
                title="Run your first week"
                body="Run service as normal – TempTake quietly collects logs in the background so you’re inspection-ready anytime."
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
                Don&apos;t have a video yet? This block will still look fine – just swap
                the file when you&apos;re ready.
              </p>
            </div>
          </div>
        </section>

        {/* ----------------------- PRICING SECTION ----------------------- */}
        <section className="border-t border-white/10 bg-slate-950">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="mb-8 max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Simple pricing when we launch.
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                During early access, we&apos;re working closely with a small group of
                kitchens. Public pricing will be simple and transparent – no per-log
                nonsense.
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
                  <span className="text-sm font-normal text-slate-300">
                    {" "}
                    during beta
                  </span>
                </div>

                <ul className="mt-4 space-y-1.5 text-sm text-slate-200">
                  <li>• ull access to TempTake features.</li>
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
                  Launch pricing
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  Simple per-site pricing
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Final pricing will depend on site size and number of locations, but it
                  will stay straightforward.
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
                  <li>• All core modules included.</li>
                  <li>• Volume options for multi-site groups.</li>
                </ul>

                <p className="mt-4 text-[11px] text-slate-500">
                  We&apos;ll confirm final pricing with all early access kitchens before
                  launch – nothing will be a surprise.
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

                {/* Tally modal trigger – waitlist section */}
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
                  Powered by Tally. No spam, ever – we’ll just email you when TempTake is
                  ready for your kitchen.
                </p>

                {/* Extra link to the demo dashboard from here too */}
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
                  <li>• Works for small independent kitchens and multi-site groups.</li>
                  <li>• Clear, exportable records you can show at any time.</li>
                </ul>
                <p className="mt-3 text-[11px] text-slate-500">
                  TempTake does not replace your legal responsibilities – it just makes
                  them much easier to stay on top of.
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
              {/* LEFT: Explanation / fun angle */}
              <div className="space-y-3 md:w-2/5">
                <h3 className="text-lg font-semibold text-white">
                  How your team makes this fun.
                </h3>
                <p className="text-sm text-slate-300">
                  TempTake isn&apos;t just boxes to tick. Your team see streaks, friendly
                  competition and little wins for doing the boring stuff properly.
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  <li>• Staff earn streaks for consistent logging.</li>
                  <li>• Leaderboard shows who&apos;s smashing their checks.</li>
                  <li>• Shout-outs wall celebrates the good days.</li>
                  <li>• Managers still see the serious side – what was done and when.</li>
                </ul>

                <Link
                  href="/demo-wall"
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
                >
                  Open full demo wall
                </Link>
              </div>

              {/* RIGHT: Mini version of the new Kitchen Wall demo */}
              <div className="md:w-3/5">
                <div className="space-y-4 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-900 via-slate-950 to-slate-950 p-4">
                  {/* Header + leaderboard summary */}
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

                  {/* Top streaks – mirrors /demo-wall content */}
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

                    {/* Sticky notes preview to match demo wall */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Shout-outs wall (demo)
                      </p>
                      <div className="space-y-3">
                        <MiniStickyNote
                          initials="JB"
                          bg="bg-yellow-200"
                          message="Kept every hot hold above 63°C all night. Zero drama on a fully booked Saturday 🔥"
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
        {/* Block 1 */}
        <div className="flex flex-col items-center gap-8 md:flex-row">
          <div className="md:w-1/2">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/60 shadow-[0_0_45px_rgba(16,185,129,0.45)]">
              {/* Fake screenshot layers */}
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
              <li>• Designed to be usable on a busy pass, one-handed.</li>
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
              <li>• Split by area: pass, pot wash, cold room, toilets and more.</li>
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
              <li>• Track allergen matrix reviews by date.</li>
              <li>• Keep staff training records together, not in random folders.</li>
              <li>• Show an EHO you have a clear system, not chaos.</li>
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
            style={{
              transform: `rotate(${Math.sin(i * 0.7) * 4}deg)`,
            }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="text-4xl font-black text-emerald-300">
                {note.initials}
              </div>
              <span className="rounded-full border border-emerald-400/70 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Chef reaction
              </span>
            </div>
            <p className="whitespace-pre-wrap text-xl leading-relaxed text-slate-100">
              “{note.message}”
            </p>
            <div className="mt-8 flex justify-end gap-1 text-2xl">
              <span>🔥</span>
              <span>🔥</span>
              <span>🔥</span>
              <span>🔥</span>
              <span>🔥</span>
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
      <div className="text-[10px] uppercase tracking-wide text-slate-400">
        {title}
      </div>
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
            (ok
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-red-500/20 text-red-200")
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
          {step}
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
      <span className="text-[11px] font-semibold text-emerald-300">
        {value}
      </span>
    </div>
  );
}

function FakeTask({ label, done }: { label: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900/70 px-2 py-1.5">
      <span className="text-[11px] text-slate-200">{label}</span>
      <span
        className={
          "h-2 w-2 rounded-full " + (done ? "bg-emerald-400" : "bg-slate-500")
        }
      />
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
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${badge}`}
        >
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
      style={{
        transform: "rotate(-2deg)",
      }}
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
