// src/app/food-hygiene-app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Food Hygiene App for UK Kitchens | TempTake",
  description:
    "TempTake is a food hygiene app for UK kitchens. Use one app for temperature logs, cleaning schedules, sign-offs, allergen controls, training records and inspection-ready reporting.",
  alternates: {
    canonical: "https://temptake.com/food-hygiene-app",
  },
  openGraph: {
    title: "Food Hygiene App for UK Kitchens | TempTake",
    description:
      "A food hygiene app built for UK kitchens. Manage temperature logs, cleaning, allergens, training and reports in one place.",
    url: "https://temptake.com/food-hygiene-app",
    siteName: "TempTake",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Hygiene App for UK Kitchens | TempTake",
    description:
      "A food hygiene app built for UK kitchens. Faster records, better visibility, cleaner reporting.",
  },
};

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const CORE_FEATURES = [
  {
    title: "Temperature logging app",
    description:
      "Log fridge, freezer and hot hold temperatures quickly with clear pass or fail status, timestamps, initials and corrective actions.",
    points: [
      "Fast temperature entries during service",
      "Pass and fail indicators",
      "Corrective action records",
      "Re-checks captured in the same workflow",
    ],
    image: "/temp_log.jpg",
    alt: "TempTake temperature logging app screen",
  },
  {
    title: "Cleaning schedule app",
    description:
      "Keep daily, weekly and monthly cleaning tasks visible inside the app so staff know what needs doing and managers can see what is complete.",
    points: [
      "Task prompting for staff",
      "Daily, weekly and monthly frequencies",
      "Completion tracking by task and category",
      "Clear overdue visibility",
    ],
    image: "/cleaning_rota.jpg",
    alt: "TempTake cleaning schedule app screen",
  },
  {
    title: "Manager dashboard app",
    description:
      "See site activity, missed checks, incidents, absences, sign-offs and training status from one manager dashboard without chasing paper records.",
    points: [
      "Remote visibility across the day",
      "Track what is done and missed",
      "Review incidents and corrective actions",
      "See team and compliance status fast",
    ],
    image: "/dashboard.jpg",
    alt: "TempTake manager dashboard app screen",
  },
  {
    title: "Training record app",
    description:
      "Track food hygiene training, expiry dates and staff coverage in the app so certificates do not quietly lapse in the background.",
    points: [
      "Certificate tracking",
      "Expiry visibility",
      "Staff training coverage",
      "Manager-friendly overview",
    ],
    image: "/training.jpg",
    alt: "TempTake training records app screen",
  },
  {
    title: "Allergen management app",
    description:
      "Keep allergen information current, structured and reviewable inside the app instead of scattered across paper sheets and memory.",
    points: [
      "Allergen matrix visibility",
      "Review history",
      "Cleaner records for menu control",
      "Useful for inspections and internal checks",
    ],
    image: "/allergens.jpg",
    alt: "TempTake allergen management app screen",
  },
  {
    title: "Wall display and team prompting",
    description:
      "Use the app to keep tasks and compliance activity visible so staff are prompted to complete records instead of leaving them until later.",
    points: [
      "Shared visibility for the team",
      "Useful during busy shifts",
      "Supports task completion habits",
      "Better accountability across the day",
    ],
    image: "/wall.jpg",
    alt: "TempTake team visibility wall screen",
  },
];

const STAFF_FEATURES = [
  "Fast app-based logging during service",
  "Prompts to complete compliance tasks",
  "Clear pass or fail feedback",
  "Simple daily workflows on mobile",
  "Less paperwork and less duplication",
  "Cleaner sign-offs and initials tracking",
];

const MANAGER_FEATURES = [
  "Check in on your business remotely anytime",
  "See what has been completed and what is overdue",
  "Review temperature failures and corrective actions",
  "Monitor cleaning, incidents, training and absences",
  "Generate reports quickly when records are requested",
  "Keep all compliance records in one place",
];

const APP_SECTIONS = [
  {
    title: "One app instead of separate paper systems",
    text: "TempTake brings temperatures, cleaning, sign-offs, allergens, training and manager oversight into one food hygiene app instead of forcing you to run five different admin habits badly.",
  },
  {
    title: "Built for staff speed",
    text: "The app is designed for fast daily use in real kitchens. Staff can complete checks quickly without stopping everything to fill out awkward paperwork.",
  },
  {
    title: "Built for manager control",
    text: "Managers get a cleaner view of what is happening across the business. That means fewer surprises, fewer missed checks and less blind trust.",
  },
  {
    title: "Built for inspection day",
    text: "The app helps you keep records ready day to day, so when an EHO or manager asks to see something, you are not trying to reconstruct reality from half-completed sheets.",
  },
];

const FAQS = [
  {
    q: "What kind of app is TempTake?",
    a: "TempTake is a food hygiene app for UK kitchens. It is also effectively a kitchen compliance app and food safety app, because it helps manage temperatures, cleaning, sign-offs, allergens, training and related records in one system.",
  },
  {
    q: "Can staff use the app on mobile?",
    a: "Yes. The app is built for daily use during service, so staff can log checks quickly instead of relying on paper sheets that get ignored, damaged or completed badly.",
  },
  {
    q: "Can managers use the app remotely?",
    a: "Yes. One of the core strengths of the app is remote manager visibility. You can check in on your business remotely anytime and see what is complete, late or missing.",
  },
  {
    q: "Does the app handle temperature failures?",
    a: "Yes. TempTake lets staff log temperature failures and record corrective actions, giving you a cleaner audit trail than crossing things out on paper and hoping it makes sense later.",
  },
  {
    q: "Can the app generate reports?",
    a: "Yes. The app is built to support inspection-ready reporting so records are easier to review, export and send when needed.",
  },
  {
    q: "Who is the app for?",
    a: "TempTake is designed for UK restaurants, takeaways, pubs, cafés, fish and chip shops and small multi-site food businesses that want a more reliable way to manage daily food hygiene records.",
  },
];

export default function FoodHygieneAppPage() {
  return (
    <main className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-x-hidden min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-[-120px] top-40 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-[1320px] items-center justify-between px-4 py-4 xl:px-6">
        <Link href="/" className="flex items-center gap-3">
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

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm hover:bg-white/10"
          >
            View demo
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
          >
            Start free trial
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1320px] gap-10 px-4 pb-16 pt-10 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-center md:pb-24 md:pt-16 xl:px-6">
        <div className="max-w-[660px]">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Food hygiene app
            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              Built for UK kitchens
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
            A food hygiene app
            <span className="text-8xl block text-emerald-300">Built by owners</span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm text-slate-200 sm:text-base">
            TempTake is a <span className="font-semibold">food hygiene app</span> for UK food
            businesses that want one app for temperature logs, cleaning schedules, sign-offs,
            allergen controls, training records and manager oversight.
          </p>

          <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            The point of the app is simple: staff are prompted to complete compliance tasks, managers can check in
            remotely anytime.
          </p>

          <p className="mt-4 text-3xl text-emerald-300">
            The business is harmoniously compliant.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
            >
              View live demo
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              Start free trial
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-slate-300">
            <span>✓ Save time logging</span>
            <span>✓ Staff task prompting</span>
            <span>✓ One-click reports</span>
            <span>✓ Remote manager access</span>
          </div>
        </div>

        <div className="md:justify-self-end">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-emerald-500/10">
            <Image
              src="/dashboard.jpg"
              alt="TempTake food hygiene app dashboard"
              width={1600}
              height={900}
              className="h-[260px] w-full object-cover object-top sm:h-[320px] lg:h-[360px]"
              priority
            />
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
            Two minutes a day and you're inspection-ready.
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              What the app actually does
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              TempTake is a food hygiene app for kitchen compliance. Built to handle the daily operational records that UK
              kitchens struggle to keep consistent on paper.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {CORE_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-lg shadow-black/30"
              >
                <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
                  <div className="overflow-hidden border-b border-slate-800 md:border-b-0 md:border-r">
                    <Image
                      src={feature.image}
                      alt={feature.alt}
                      width={900}
                      height={1200}
                      className="h-[280px] w-full object-cover object-top"
                    />
                  </div>

                  <div className="p-5">
                    <div className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                      App feature
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm text-slate-300">{feature.description}</p>

                    <ul className="mt-4 space-y-2 text-sm text-slate-200">
                      {feature.points.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto grid w-full max-w-[1320px] gap-6 px-4 py-12 md:grid-cols-2 md:py-16 xl:px-6">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg shadow-black/30">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Staff app features
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              What staff use the app for
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Staff need an app that is quick, obvious and usable in the middle of an actual
              shift, not some back-office fantasy tool.
            </p>

            <ul className="mt-5 space-y-3 text-sm text-slate-100">
              {STAFF_FEATURES.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6 shadow-lg shadow-black/30">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
              Manager app features
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              What managers use the app for
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Managers need visibility, accountability and reporting without being chained to the
              site all day.
            </p>

            <ul className="mt-5 space-y-3 text-sm text-slate-100">
              {MANAGER_FEATURES.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Why this app works better than paper
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              Paper depends on memory, timing and discipline. The app gives you structure,
              prompts, visibility and a proper audit trail. Shocking that software might outperform
              a clipboard abandoned near the fryer.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {APP_SECTIONS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/30"
              >
                <h3 className="text-base font-semibold text-slate-50">{item.title}</h3>
                <p className="mt-3 text-sm text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="grid gap-6 md:grid-cols-[1fr_0.95fr] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Reporting is part of the app, not an afterthought
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                A food safety app is not very useful if the records stay trapped in it. TempTake
                is designed so you can review what happened, generate reports quickly and send
                records when an EHO inspector, manager or owner needs to see them.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-slate-200">
                <li>• Generate inspection-ready reports faster</li>
                <li>• Review recorded checks and corrective actions</li>
                <li>• Keep daily records organised in one place</li>
                <li>• Avoid the paper-folder panic when someone asks for proof</li>
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
                >
                  View live demo
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
                >
                  Start free trial
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/30">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                In-app outcome
              </div>
              <div className="mt-4 space-y-3">
                <WorkflowRow
                  title="1. Staff log checks"
                  text="The app captures temperatures, cleaning and daily compliance records quickly."
                />
                <WorkflowRow
                  title="2. Managers review the dashboard"
                  text="The manager dashboard shows what is complete, failed, overdue or unresolved."
                />
                <WorkflowRow
                  title="3. Reports are ready"
                  text="When records are requested, you are working from stored data instead of chaos."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 text-center md:py-16 xl:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            See the food hygiene app in action
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            Open the live demo to see how the app handles temperatures, cleaning, incidents,
            sign-offs, training and manager visibility in one working system.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
            >
              View live demo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/90">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="mb-6 max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Food hygiene app FAQs
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              More app-specific answers, since apparently people like knowing what software does
              before they use it.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30 open:bg-slate-900/80"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-50">
                  <span className="inline-flex items-start justify-between gap-3">
                    <span>{faq.q}</span>
                    <span className="text-slate-400 group-open:text-emerald-300">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-300">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center md:py-20">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">
            Use one food hygiene app
            <span className="block text-emerald-300">instead of juggling paper, memory and luck</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            TempTake gives UK kitchens one app for daily food hygiene records, manager oversight
            and faster reporting. Save time logging, keep staff on track and stay ready when
            records are requested.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-lime-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 hover:brightness-105"
            >
              Start free trial
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              View live demo
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function WorkflowRow({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <p className="mt-1 text-sm text-slate-300">{text}</p>
    </div>
  );
}