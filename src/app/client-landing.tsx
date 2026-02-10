// src/app/launch/page.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";

import LaunchClient from "./launch/LauncgClient";

/* ---------------------- DEMO SOCIAL WALL DATA (NOT “REAL”) ---------------------- */

const demoNotes = [
  { initials: "JB", message: "The pulsing FAB saves so much time 🔥" },
  { initials: "SC", message: "Finally… something my team actually wants to use" },
  { initials: "MK", message: "Paper logs are on the char-grill" },
  { initials: "TR", message: "Take my money already" },
  { initials: "DW", message: "Saved me 90 mins today. 90!" },
  { initials: "RH", message: "Just beat my CDP to top spot on the leaderboard" },
  { initials: "LF", message: "EHO walked in, pressed one button, walked out happy" },
  { initials: "NP", message: "I can see how my kitchen is running from home" },
];

/* ---------------------- PUBLIC GUIDES (LAUNCH PAGE) ---------------------- */

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

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function LaunchPage() {
  const tallyId = "obb4vX";

  // Server renders the page fast + crawlable.
  // Client only handles sticky CTA + Tally popup open.
  const tallyAttrs = {
    "data-tally-open": tallyId,
    "data-tally-layout": "modal",
    "data-tally-emoji-text": "👋",
    "data-tally-emoji-animation": "wave",
    "data-tally-auto-close": "0",
  } as const;

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto overflow-x-hidden">
      <LaunchClient tallyId={tallyId} />

      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        {/* Top bar */}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Link href="/launch" className="flex items-center gap-2">
              <Image src="/logo.png" width={44} height={44} alt="TempTake" />
              <span className="font-semibold">TempTake</span>
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

        {/* ----------------------- HERO SECTION ----------------------- */}
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 md:flex-row md:items-center md:pb-24 md:pt-16">
          <div className="md:w-1/2">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Early access for UK kitchens
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                🎙 Voice entry
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Food safety checks
              <span className="block text-emerald-300">logged properly.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm text-slate-200 sm:text-base">
              TempTake replaces paper logs with fast, inspection-ready records for{" "}
              <span className="font-semibold">temperatures, cleaning, allergens and training</span>.
              Log checks mid-service with{" "}
              <span className="font-semibold text-emerald-200">voice entry</span> when hands are full.
            </p>

            {/* CTA hierarchy: ONE primary, ONE secondary */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                {...tallyAttrs}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:brightness-105"
              >
                Join early access
              </button>

              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
              >
                View demo
              </Link>

              <Link
                href="#faq"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20"
              >
                What EHOs expect
              </Link>
            </div>

            {/* Outcome-first facts */}
            <dl className="mt-8 grid grid-cols-2 gap-4 text-xs text-slate-200 sm:text-sm md:max-w-md">
              <div>
                <dt className="text-slate-400">Built for</dt>
                <dd className="mt-0.5 font-semibold">
                  Restaurants, pubs, bistros & takeaways
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Core modules</dt>
                <dd className="mt-0.5 font-semibold">
                  Temps • Cleaning • Allergens • Training
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Audit trail</dt>
                <dd className="mt-0.5 font-semibold">Initials • timestamps • exports</dd>
              </div>
              <div>
                <dt className="text-slate-400">Availability</dt>
                <dd className="mt-0.5 font-semibold">Beta kitchens now • iOS next</dd>
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
                  Inspection-ready
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
                  <span className="text-[11px] text-slate-500">Tap to log</span>
                </div>

                <div className="space-y-1.5">
                  <MockLogRow label="Walk-in fridge" temp="3.4°C" status="pass" time="08:15" />
                  <MockLogRow label="Chicken curry (hot hold)" temp="62.0°C" status="pass" time="12:05" />
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

        {/* ----------------------- TRUST / PROOF SECTION ----------------------- */}
        <section className="border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="grid gap-6 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  What your EHO cares about
                  <span className="text-emerald-300"> is what TempTake shows.</span>
                </h2>
                <p className="mt-3 text-sm text-slate-300 sm:text-base">
                  Clear logs, consistent checks, proof of corrective action, and a system your team
                  actually follows. Not a binder of “we’ll fill it in later”.
                </p>

                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  <li>• Initials + timestamps on every record</li>
                  <li>• Failed temps trigger corrective actions (auditable)</li>
                  <li>• Managers see what’s missing before inspection day</li>
                  <li>• Exportable records when you need them</li>
                </ul>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href="/app"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
                  >
                    View demo
                  </Link>

                  <button
                    type="button"
                    {...tallyAttrs}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105"
                  >
                    Join early access
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                    This is the “show me your system” moment EHOs love.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------------- FEATURE GRID ----------------------- */}
        <section className="border-t border-white/10 bg-slate-950/70">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 md:py-16">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Inspection-ready records,
                <span className="text-emerald-300"> without clipboard chaos.</span>
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                Daily checks stay simple and fast. No more half-filled sheets, missing initials,
                or “we’ll do it later” turning into “we never did it”.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <FeatureCard
                title="Temperature logging"
                pill="Fridges, freezers & hot hold"
                description="One-tap routines. Cleaner records, less staff time, fewer missed checks."
              />
              <FeatureCard
                title="Cleaning rota"
                pill="Front & back of house"
                description="Daily/weekly/monthly tasks on mobile. Swipe to complete, see what’s open."
              />
              <FeatureCard
                title="Allergen & training"
                pill="Matrix & certificates"
                description="Keep allergen info current and stop training quietly expiring."
              />
              <FeatureCard
                title="Voice entry"
                pill="Hands busy? No problem"
                description="Speak checks during service. Auditable, timestamped, and fast."
              />
            </div>
          </div>
        </section>

        {/* ----------------------- GUIDES SECTION ----------------------- */}
        <section id="guides" className="border-t border-white/10 bg-slate-950">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
            <div className="mb-6 max-w-3xl">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Practical guides you can share with the team.
                <span className="text-emerald-300"> No fluff.</span>
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Useful even before you sign up. Built around UK expectations and real kitchen workflows.
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
              <button
                type="button"
                {...tallyAttrs}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/40 hover:brightness-105"
              >
                Join early access
              </button>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
          </div>
        </section>

        {/* ----------------------- FAQ SECTION ----------------------- */}
        <FAQSection />

        {/* ----------------------- DEMO SOCIAL WALL ----------------------- */}
        <StagedWall notes={demoNotes} />

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
                {...tallyAttrs}
                className="text-slate-300 hover:text-emerald-300"
              >
                Join early access
              </button>

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

/* ----------------------- FAQ SECTION ----------------------- */

function FAQSection() {
  const faqs = [
    {
      q: "Do I still need Safer Food Better Business (SFBB)?",
      a: "SFBB is still the recognised system in many UK businesses. TempTake helps you run the daily checks and keep records in a way that aligns with SFBB expectations, but it doesn’t replace your legal responsibilities.",
    },
    {
      q: "What does an EHO expect to see during an inspection?",
      a: "Consistent records (initials + timestamps), checks done at sensible intervals, evidence of corrective action when something fails, and a system your staff actually follow.",
    },
    {
      q: "What happens if a temperature fails?",
      a: "TempTake flags it and you record a corrective action (and optionally a re-check temp). That creates an audit trail instead of a crossed-out number on paper.",
    },
    {
      q: "Can I export logs if I need to show them?",
      a: "Yes. The whole point is that you can show inspection-ready records quickly without hunting through binders.",
    },
    {
      q: "Can staff log checks without a manager?",
      a: "Yes. Staff can log temps/cleaning with initials. Managers get visibility of what’s missing and what needs attention.",
    },
    {
      q: "Does it work for multi-site groups?",
      a: "Yes. Pricing is banded by location count and the app is designed to scale from one site to multiple.",
    },
  ];

  return (
    <section id="faq" className="border-t border-white/10 bg-slate-950/90">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
        <div className="mb-6 max-w-3xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            FAQs kitchens actually ask.
            <span className="text-emerald-300"> Not marketing fluff.</span>
          </h2>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Clear answers to the stuff that matters when you’re trying to stay compliant and keep service moving.
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

/* ----------------------- DEMO SOCIAL WALL ----------------------- */

function StagedWall({ notes }: { notes: Array<{ initials: string; message: string }> }) {
  return (
    <section className="border-t border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-24">
      <div className="mx-auto mb-14 max-w-5xl px-4 text-center">
        <h2 className="mb-4 text-4xl font-extrabold text-white md:text-6xl">
          Demo reactions wall
        </h2>
        <p className="text-lg text-slate-300 md:text-xl">
          Example only (placeholder quotes until beta kitchens give real ones).
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note, i) => (
          <div
            key={i}
            className="relative rounded-3xl border border-emerald-400/60 bg-slate-950/80 p-8 shadow-[0_0_40px_rgba(34,197,94,0.45)] transition-all duration-300 hover:-rotate-1 hover:scale-105 md:p-9"
            style={{ transform: `rotate(${Math.sin(i * 0.7) * 4}deg)` }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="text-4xl font-black text-emerald-300">{note.initials}</div>
              <span className="rounded-full border border-emerald-400/70 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Demo quote
              </span>
            </div>
            <p className="whitespace-pre-wrap text-xl leading-relaxed text-slate-100">
              “{note.message}”
            </p>

            <div className="pointer-events-none absolute -inset-px rounded-3xl border border-emerald-400/20 blur-[2px]" />
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-xl font-semibold text-emerald-200 md:text-2xl">
          Get real quotes by onboarding 5 beta kitchens.
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
