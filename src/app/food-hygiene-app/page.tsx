import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Food Hygiene Software for UK Food Businesses | TempTake",
  description:
    "Food hygiene software for UK food businesses. Manage temperature logs, cleaning schedules, sign-offs, allergen controls, training records and inspection-ready reporting in one system.",
  alternates: {
    canonical: "https://temptake.com/food-hygiene-app",
  },
  openGraph: {
    title: "Food Hygiene Software for UK Food Businesses | TempTake",
    description:
      "Digital food hygiene software for UK kitchens. Manage temperature logs, cleaning, allergens, training and reports in one place.",
    url: "https://temptake.com/food-hygiene-app",
    siteName: "TempTake",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food Hygiene Software for UK Food Businesses | TempTake",
    description:
      "Digital food hygiene software for UK kitchens. Faster records, better visibility, cleaner reporting.",
  },
};

const CORE_FEATURES = [
  {
    title: "Temperature logging software",
    description:
      "Log fridge, freezer and hot-hold temperatures quickly with clear pass or fail status, timestamps, initials and corrective actions.",
    points: [
      "Fast temperature entries during service",
      "Pass and fail indicators",
      "Corrective action records",
      "Re-checks captured in the same workflow",
    ],
    image: "/temp_log.jpg",
    alt: "TempTake temperature logging screen",
  },
  {
    title: "Cleaning schedule software",
    description:
      "Keep daily, weekly and monthly cleaning tasks visible so staff know what needs doing and managers can see what is complete.",
    points: [
      "Task prompting for staff",
      "Daily, weekly and monthly frequencies",
      "Completion tracking by task and category",
      "Clear overdue visibility",
    ],
    image: "/cleaning_rota.jpg",
    alt: "TempTake cleaning schedule screen",
  },
  {
    title: "Manager dashboard",
    description:
      "See site activity, missed checks, incidents, absences, sign-offs and training status from one dashboard without chasing paper records.",
    points: [
      "Remote visibility across the day",
      "Track what is done and missed",
      "Review incidents and corrective actions",
      "See team and compliance status fast",
    ],
    image: "/dashboard.jpg",
    alt: "TempTake manager dashboard screen",
  },
  {
    title: "Training records",
    description:
      "Track food hygiene training, expiry dates and staff coverage so certificates do not quietly lapse in the background.",
    points: [
      "Certificate tracking",
      "Expiry visibility",
      "Staff training coverage",
      "Manager-friendly overview",
    ],
    image: "/training.jpg",
    alt: "TempTake training records screen",
  },
  {
    title: "Allergen management",
    description:
      "Keep allergen information current, structured and reviewable instead of scattered across paper sheets and memory.",
    points: [
      "Allergen matrix visibility",
      "Review history",
      "Cleaner records for menu control",
      "Useful for inspections and internal checks",
    ],
    image: "/allergens.jpg",
    alt: "TempTake allergen management screen",
  },
  {
    title: "Team prompting and visibility",
    description:
      "Keep tasks and compliance activity visible so staff are prompted to complete records instead of leaving them until later.",
    points: [
      "Shared visibility for the team",
      "Useful during busy shifts",
      "Supports task completion habits",
      "Better accountability across the day",
    ],
    image: "/wall.jpg",
    alt: "TempTake wall display and team visibility screen",
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
    title: "One system instead of separate paper habits",
    text: "TempTake brings temperatures, cleaning, sign-offs, allergens, training and manager oversight into one food hygiene software system instead of forcing you to run five separate admin habits badly.",
  },
  {
    title: "Built for staff speed",
    text: "The software is designed for fast daily use in real kitchens. Staff can complete checks quickly without stopping everything to fill out awkward paperwork.",
  },
  {
    title: "Built for manager control",
    text: "Managers get a cleaner view of what is happening across the business. That means fewer surprises, fewer missed checks and less blind trust.",
  },
  {
    title: "Built for inspection day",
    text: "The software helps you keep records ready day to day, so when an EHO or manager asks to see something, you are not trying to reconstruct reality from half-completed sheets.",
  },
];

const FAQS = [
  {
    q: "What kind of software is TempTake?",
    a: "TempTake is food hygiene software for UK food businesses. It helps manage temperatures, cleaning, sign-offs, allergens, training and related records in one system.",
  },
  {
    q: "Can staff use it on mobile?",
    a: "Yes. It is built for daily use during service, so staff can log checks quickly instead of relying on paper sheets that get ignored, damaged or completed badly.",
  },
  {
    q: "Can managers use it remotely?",
    a: "Yes. One of the core strengths is remote manager visibility. You can check in on your business remotely anytime and see what is complete, late or missing.",
  },
  {
    q: "Does it handle temperature failures?",
    a: "Yes. TempTake lets staff log temperature failures and record corrective actions, giving you a cleaner audit trail than crossing things out on paper and hoping it makes sense later.",
  },
  {
    q: "Can it generate reports?",
    a: "Yes. The system is built to support inspection-ready reporting so records are easier to review, export and send when needed.",
  },
  {
    q: "Who is it for?",
    a: "TempTake is designed for UK restaurants, takeaways, pubs, cafés, fish and chip shops and small multi-site food businesses that want a more reliable way to manage daily food hygiene records.",
  },
];

const SECTOR_LINKS = [
  {
    href: "/restaurant-food-safety-app",
    label: "Restaurants",
    text: "More control across prep areas, allergens, teams and daily checks.",
  },
  {
    href: "/cafe-food-safety-app",
    label: "Cafés",
    text: "Simple daily compliance for chilled food, small teams and cleaning.",
  },
  {
    href: "/takeaway-food-safety-app",
    label: "Takeaways",
    text: "Fast, practical checks for busy service and paper-free daily records.",
  },
  {
    href: "/pub-food-safety-app",
    label: "Pubs serving food",
    text: "Keep kitchen checks, cleaning and allergen records organised across shifts.",
  },
  {
    href: "/fish-and-chip-shop-food-safety-app",
    label: "Fish & chip shops",
    text: "Built for chippies handling hot-hold, chilled storage and service pressure.",
  },
  {
    href: "/mobile-catering-food-safety-app",
    label: "Mobile caterers",
    text: "Keep food safety records on your phone wherever you are trading.",
  },
];

const GUIDE_LINKS = [
  {
    href: "/guides/food-hygiene-temperature-logs-uk",
    title: "Temperature logs guide",
    text: "What to record, how often and what EHOs expect.",
  },
  {
    href: "/guides/kitchen-cleaning-rota-uk",
    title: "Cleaning rota guide",
    text: "Tasks, frequencies and how to keep cleaning records compliant.",
  },
  {
    href: "/guides/allergen-matrix-uk",
    title: "Allergen matrix guide",
    text: "How often to review it and what inspectors expect.",
  },
  {
    href: "/guides/food-hygiene-training-expiry-uk",
    title: "Training expiry guide",
    text: "How long certificates last and when refreshers should happen.",
  },
];

export default function FoodHygieneAppPage() {
  return (
    <main className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
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
              Food hygiene software for UK food businesses
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
            Food hygiene software
            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              Built for UK food businesses
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
            Food hygiene software for UK food businesses
            <span className="block text-emerald-300">replace paper with one live system.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm text-slate-200 sm:text-base">
            TempTake is food hygiene software for UK food businesses that want one
            system for temperature logs, cleaning schedules, sign-offs, allergen
            controls, training records and manager oversight.
          </p>

          <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            Staff are prompted to complete compliance tasks, managers can check in
            remotely anytime, and records stay inspection-ready without relying on
            paper, memory or luck.
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
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
            >
              View pricing
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-slate-300">
            <span>✓ Save time logging</span>
            <span>✓ Staff task prompting</span>
            <span>✓ One-click reports</span>
            <span>✓ Remote manager access</span>
          </div>

          <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Built for
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm font-medium text-white">
              <Link href="/restaurant-food-safety-app" className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/10">
                Restaurants
              </Link>
              <Link href="/takeaway-food-safety-app" className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/10">
                Takeaways
              </Link>
              <Link href="/cafe-food-safety-app" className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/10">
                Cafés
              </Link>
              <Link href="/pub-food-safety-app" className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/10">
                Pubs
              </Link>
              <Link href="/fish-and-chip-shop-food-safety-app" className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/10">
                Fish & chip shops
              </Link>
              <Link href="/mobile-catering-food-safety-app" className="rounded-full border border-white/15 px-3 py-1.5 hover:bg-white/10">
                Mobile caterers
              </Link>
            </div>
          </div>
        </div>

        <div className="md:justify-self-end">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-emerald-500/10">
            <Image
              src="/dashboard.jpg"
              alt="TempTake food hygiene software dashboard"
              width={1600}
              height={900}
              className="h-[260px] w-full object-cover object-top sm:h-[320px] lg:h-[360px]"
              priority
            />
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
            Faster daily records. Better visibility. Cleaner proof when asked.
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              What the software actually does
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              TempTake is food hygiene software built to handle the daily operational
              records that UK food businesses struggle to keep consistent on paper.
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
                      Software feature
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

          <div className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              The point
            </div>
            <h3 className="mt-3 text-xl font-semibold text-white">
              This is not software for “looking compliant”.
            </h3>
            <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
              It is software for actually running daily food hygiene properly, with records
              you can trust, managers can review and inspectors can follow.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Built for your type of food business
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              TempTake is not generic software trying to fit every kitchen the same way.
              Choose the version that matches how your business actually works.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {SECTOR_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/30 hover:bg-slate-900/90"
              >
                <div className="text-base font-semibold text-slate-100">{item.label}</div>
                <p className="mt-2 text-sm text-slate-300">{item.text}</p>
                <div className="mt-4 text-sm font-semibold text-emerald-300">View page →</div>
              </Link>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href="/sectors"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-50 shadow-sm hover:bg-white/10"
            >
              View all sector pages
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto grid w-full max-w-[1320px] gap-6 px-4 py-12 md:grid-cols-2 md:py-16 xl:px-6">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg shadow-black/30">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Staff software features
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              What staff use it for
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Staff need software that is quick, obvious and usable in the middle of an actual
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
              Manager software features
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              What managers use it for
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
              Why this works better than paper
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              Paper depends on memory, timing and discipline. TempTake gives you structure,
              prompts, visibility and a proper audit trail.
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

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 shadow-lg shadow-black/30">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                What paper usually means
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                <li>❌ End-of-day catch-up instead of live records</li>
                <li>❌ Missing initials and weak accountability</li>
                <li>❌ Managers finding problems too late</li>
                <li>❌ Scrambling when someone asks for proof</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-lg shadow-black/30">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                What TempTake gives you instead
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-100">
                <li>✅ Live daily records instead of reconstructed ones</li>
                <li>✅ Clear audit trail with timestamps and accountability</li>
                <li>✅ Better visibility for managers across the day</li>
                <li>✅ Faster reporting when records are requested</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="grid gap-6 md:grid-cols-[1fr_0.95fr] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Reporting is built in, not bolted on
              </h2>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                Food hygiene software is not very useful if the records stay trapped in it.
                TempTake is designed so you can review what happened, generate reports quickly
                and send records when an EHO, manager or owner needs to see them.
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
                Workflow
              </div>
              <div className="mt-4 space-y-3">
                <WorkflowRow
                  title="1. Staff log checks"
                  text="The system captures temperatures, cleaning and daily compliance records quickly."
                />
                <WorkflowRow
                  title="2. Managers review the dashboard"
                  text="The dashboard shows what is complete, failed, overdue or unresolved."
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

      <section className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 md:py-16 xl:px-6">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Learn what EHOs actually expect
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              These public guides help explain the standards behind the software, and they also
              show why paper systems fall apart so often in real kitchens.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {GUIDE_LINKS.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-black/30 hover:bg-slate-900/90"
              >
                <div className="text-base font-semibold text-slate-100">{guide.title}</div>
                <p className="mt-2 text-sm text-slate-300">{guide.text}</p>
                <div className="mt-4 text-sm font-semibold text-emerald-300">Read guide →</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-12 text-center md:py-16 xl:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            See the software in action
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            Open the live demo to see how TempTake handles temperatures, cleaning, incidents,
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
              Food hygiene software FAQs
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Straight answers about what the software does and how it fits daily use.
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
            Use one food hygiene software system
            <span className="block text-emerald-300">instead of juggling paper, memory and luck</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
            TempTake gives UK food businesses one system for daily food hygiene records,
            manager oversight and faster reporting. Save time logging, keep staff on track
            and stay ready when records are requested.
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
            <Link
              href="/sectors"
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20"
            >
              Browse by sector
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