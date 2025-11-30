// src/app/launch/page.tsx
"use client";

import React from "react";
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
  return (
    // Full-screen wrapper so this page covers the whole viewport
    <div className="fixed inset-0 z-20 overflow-y-auto">
      {/* Tally embed script */}
      <Script
        src="https://tally.so/widgets/embed.js"
        async
      />

      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* ----------------------- HERO SECTION ----------------------- */}
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 md:flex-row md:items-center md:pb-24 md:pt-16">
          <div className="md:w-1/2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Early access · Coming soon
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

              {/* View dashboard – points at your main app route */}
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
              >
                View app dashboard
              </Link>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 text-xs text-slate-200 sm:text-sm md:max-w-md">
              <div>
                <dt className="text-slate-400">Built for</dt>
                <dd className="mt-0.5 font-semibold">UK cafes, pubs & QSR</dd>
              </div>
              <div>
                <dt className="text-slate-400">What it covers</dt>
                <dd className="mt-0.5 font-semibold">
                  Temps • Cleaning • Allergen review
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

        {/* ----------------------- FEATURES ----------------------- */}
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

        {/* ----------------------- HOW IT WORKS ----------------------- */}
        <section className="border-t border-white/10 bg-slate-900/90">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <ol className="grid gap-4 md:grid-cols-3">
              <StepCard
                step="1"
                title="Set up your kitchen"
                body="Add your fridges, freezers, hot hold and key cleaning areas. It takes minutes, not hours."
              />
              <StepCard
                step="2"
                title="Give staff the app"
                body="Each team member gets simple routines on their own phone – with initials tracked on every log."
              />
              <StepCard
                step="3"
                title="Tap, swipe, done"
                body="Staff log temps and cleaning as they go. Managers see a clear overview and can export reports any time."
              />
            </ol>
          </div>
        </section>

        {/* ----------------------- NEON GLOW WALL ----------------------- */}
        <StagedWall />

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
    </div>
  );
}

/* ----------------------- NEON GLOW WALL COMPONENT ----------------------- */

function StagedWall() {
  return (
    <section className="border-t border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-24">
      <div className="mx-auto max-w-5xl px-4 text-center mb-14">
        <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-4">
          Chefs are already losing their minds
        </h2>
        <p className="text-lg md:text-xl text-slate-300">
          (Real reactions from the first kitchens testing TempTake)
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {fakeNotes.map((note, i) => (
          <div
            key={i}
            className="relative rounded-3xl p-8 md:p-9 bg-slate-950/80 border border-emerald-400/60 shadow-[0_0_40px_rgba(34,197,94,0.45)] transform transition-all duration-300 hover:scale-105 hover:-rotate-1"
            style={{
              transform: `rotate(${Math.sin(i * 0.7) * 4}deg)`,
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="text-4xl font-black text-emerald-300">{note.initials}</div>
              <span className="rounded-full border border-emerald-400/70 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Chef reaction
              </span>
            </div>
            <p className="text-xl leading-relaxed text-slate-100 whitespace-pre-wrap">
              “{note.message}”
            </p>
            <div className="mt-8 flex gap-1 justify-end text-2xl">
              <span>🔥</span>
              <span>🔥</span>
              <span>🔥</span>
              <span>🔥</span>
              <span>🔥</span>
            </div>

            {/* Neon edge accent */}
            <div className="pointer-events-none absolute -inset-px rounded-3xl border border-emerald-400/20 blur-[2px]" />
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-xl md:text-2xl font-semibold text-emerald-200">
          Be the next name on this wall.
        </p>
      </div>
    </section>
  );
}

/* ----------------------- SMALL INTERNAL COMPONENTS ----------------------- */

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
        <span className="uppercase tracking-[0.15em]">Step {step}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-xs text-slate-300 sm:text-sm">{body}</p>
    </li>
  );
}
